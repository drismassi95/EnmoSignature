import { Component, OnInit, ViewChild, ElementRef, Input, HostListener } from '@angular/core';
import { SignaturesContentService } from '../service/signatures.service';
import { DomSanitizer } from '@angular/platform-browser';
import { MatDialog, MatBottomSheet, MatBottomSheetConfig, MatSidenav } from '@angular/material';
import { SignaturesComponent } from '../signatures/signatures.component';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../service/notification.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { CookieService } from 'ngx-cookie-service';
import { DocumentNotePadComponent } from '../documentNotePad/document-note-pad.component';
import { WarnModalComponent } from '../modal/warn-modal.component';
import { RejectInfoBottomSheetComponent } from '../modal/reject-info.component';
import { ConfirmModalComponent } from '../modal/confirm-modal.component';
import { SuccessInfoValidBottomSheetComponent } from '../modal/success-info-valid.component';
import { SimplePdfViewerComponent } from 'simple-pdf-viewer';
import { TranslateService } from '@ngx-translate/core';
import { CdkDragEnd, DragRef, CdkDrag } from '@angular/cdk/drag-drop';

declare var PDFJS: any;

@Component({
    selector: 'app-document',
    templateUrl: 'document.component.html',
    styleUrls: ['document.component.scss'],
    animations: [
        trigger(
            'enterApp',
            [
                transition(
                    ':leave', [
                        style({ transform: 'translateY(0)' }),
                        animate('500ms', style({ transform: 'translateY(-100%)' })),
                    ]
                )]
        ),
        trigger(
            'slideDown',
            [
                transition(
                    ':enter', [
                        style({ transform: 'translateY(-100%)', opacity: 0 }),
                        animate('500ms', style({ transform: 'translateY(0)', 'opacity': 1 }))
                    ]
                ),
                transition(
                    ':leave', [
                        style({ transform: 'translateY(0)', 'opacity': 1 }),
                        animate('500ms', style({ transform: 'translateY(-100%)', 'opacity': 0 })),
                    ]
                )]
        ),
        trigger(
            'slideUp',
            [
                transition(
                    ':enter', [
                        style({ transform: 'translateY(100%)', opacity: 0 }),
                        animate('500ms', style({ transform: 'translateY(0)', 'opacity': 1 }))
                    ]
                ),
                transition(
                    ':leave', [
                        style({ transform: 'translateY(0)', 'opacity': 1 }),
                        animate('500ms', style({ transform: 'translateY(100%)', 'opacity': 0 })),
                    ]
                )]
        )
    ],
})
export class DocumentComponent implements OnInit {

    enterApp: boolean = true;
    pageNum: number = 1;
    signaturesContent: any = [];
    totalPages: number;
    draggable: boolean;
    loadingDoc: boolean = true;
    currentDoc: number = 0;
    docList: any = [];
    actionsList: any = [];
    pdfDataArr: any;
    freezeSidenavClose: boolean = false;
    startX: number = 0;
    startY: number = 0;
    snapshot: any = '';
    widthDoc: string = '100%';
    resetDragPos: boolean = false;

    @Input() mainDocument: any = {};

    @ViewChild('snav') snav: MatSidenav;
    @ViewChild('snavRight') snavRight: MatSidenav;
    @ViewChild('dragElem') dragElem: any;
    @ViewChild('appDocumentNotePad') appDocumentNotePad: DocumentNotePadComponent;
    @ViewChild(SimplePdfViewerComponent) private pdfViewer: SimplePdfViewerComponent;

    @HostListener('mousedown', ['$event']) protected onPMouseDown(event: any) {
        event.preventDefault();
    }

    @HostListener('window:resize', ['$event'])
    onResize(event: any) {
        this.signaturesService.workingAreaHeight = $('#snapshotPdf').height();
        this.signaturesService.workingAreaWidth = $('#snapshotPdf').width();
    }

    constructor(private translate: TranslateService, private router: Router, private route: ActivatedRoute, public http: HttpClient,
        public signaturesService: SignaturesContentService,
        public notificationService: NotificationService,
        private cookieService: CookieService,
        private sanitizer: DomSanitizer, public dialog: MatDialog, private bottomSheet: MatBottomSheet) {
        this.draggable = false;
        PDFJS.workerSrc = './../node_modules/simple-pdf-viewer/node_modules/pdfjs-dist/build/pdf.worker.min.js';

        if (!this.cookieService.check('maarchParapheurAuth')) {
            this.router.navigate(['/login']);
        }
    }

    ngOnInit(): void {
        setTimeout(() => {
            this.enterApp = false;
        }, 500);
        this.route.params.subscribe(params => {
            if (typeof params['id'] !== 'undefined') {
                this.snapshot = null;
                this.signaturesService.renderingDoc = true;
                this.http.get('../rest/documents/' + params['id'])
                    .subscribe((data: any) => {
                        this.mainDocument = data.document;

                        this.signaturesService.mainDocumentId = this.mainDocument.id;
                        this.initDoc();
                        if (this.actionsList.length === 0) {
                            this.http.get('../rest/actions')
                                .subscribe((dataActionsList: any) => {
                                    this.actionsList = dataActionsList.actions;
                                    this.actionsList.forEach((element: any) => {
                                        element.allowed = (this.mainDocument.actionsAllowed.indexOf(element.id) > -1);
                                    });
                                });
                        } else {
                            this.actionsList.forEach((element: any) => {
                                element.allowed = (this.mainDocument.actionsAllowed.indexOf(element.id) > -1);
                            });
                        }

                        if (this.signaturesService.signaturesList.length === 0) {
                            this.http.get('../rest/users/' + this.signaturesService.userLogged.id + '/signatures')
                                .subscribe((dataSign: any) => {
                                    this.signaturesService.signaturesList = dataSign.signatures;
                                    this.signaturesService.loadingSign = false;
                                });
                        }
                        this.docList.push({ 'id': this.mainDocument.id, 'encodedDocument': this.mainDocument.encodedDocument, 'subject': this.mainDocument.subject });
                        this.mainDocument.attachments.forEach((attach: any) => {
                            this.docList.push({ 'id': attach, 'encodedDocument': '', 'title': '' });
                        });

                        this.pdfRender(this.docList[this.currentDoc]);
                        setTimeout(() => {
                            this.loadingDoc = false;
                        }, 500);
                        this.loadNextDoc();
                    }, (err: any) => {
                        this.notificationService.handleErrors(err);
                    });
            } else {
                this.snav.open();
                this.freezeSidenavClose = true;
                this.loadingDoc = false;
            }
        });
    }

    initDoc() {
        this.docList = [];
        this.signaturesService.signaturesContent = [];
        this.signaturesService.notesContent = [];

        let notesContent = localStorage.getItem(this.mainDocument.id.toString());
        if (notesContent) {
            let storageContent = JSON.parse(notesContent);
            this.signaturesService.notesContent = storageContent['note'];
            this.signaturesService.signaturesContent = storageContent['sign'];
        }

        this.signaturesService.currentAction = 0;
        this.signaturesService.currentPage = 1;
        this.pageNum = 1;
        this.signaturesContent.currentDoc = 1;
        this.currentDoc = 0;
    }

    pdfRender(document: any) {
        const binary_string = window.atob(document.encodedDocument);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        this.pdfDataArr = bytes.buffer;
        this.pdfViewer.openDocument(this.pdfDataArr);
    }

    pdfRendered() {
        this.pdfViewer.setZoom(this.signaturesService.scale);

        this.totalPages = this.pdfViewer.getNumberOfPages();
        this.signaturesService.totalPage = this.totalPages;

        this.getPdfImage();

        this.signaturesService.renderingDoc = false;
    }

    getPdfImage() {
        this.resetDragPosition();
        this.snapshot = null;
        this.pdfViewer.getPageSnapshot(2).then(snapshot => {
            if (snapshot) {
                this.snapshot = URL.createObjectURL(snapshot);
                this.snapshot = this.sanitizer.bypassSecurityTrustResourceUrl(this.snapshot);
                setTimeout(() => {
                    this.signaturesService.workingAreaHeight = $('#snapshotPdf').height();
                    this.signaturesService.workingAreaWidth = $('#snapshotPdf').width();
                }, 1000);

            }
        });
    }

    testDrag(event: any) {
        const element = event.source.getRootElement();
        const boundingClientRect = element.getBoundingClientRect();
        const parentPosition = this.getPosition(element);

        this.signaturesService.y = (boundingClientRect.y - parentPosition.top);
        this.signaturesService.x = (boundingClientRect.x - parentPosition.left);
    }

    getPosition(el: any) {
        let x = 0;
        let y = 0;
        while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
            x += el.offsetLeft - el.scrollLeft;
            y += el.offsetTop - el.scrollTop;
            el = el.offsetParent;
        }
        return { top: y, left: x };
    }

    pdfError(e: any) {
        console.log(e);
    }

    zoomForNotes() {
        this.widthDoc = '200%';
        this.signaturesService.scale = 2;
        $('.example-box').css({ 'transform': 'translate3d(' + this.signaturesService.x * this.signaturesService.scale + 'px, ' + this.signaturesService.y * this.signaturesService.scale + 'px, 0px)' });

        this.signaturesService.workingAreaHeight *= this.signaturesService.scale;
        this.signaturesService.workingAreaWidth *= this.signaturesService.scale;

    }

    zoomForView() {
        this.resetDragPosition();
        this.widthDoc = '100%';
        this.signaturesService.workingAreaHeight /= this.signaturesService.scale;
        this.signaturesService.workingAreaWidth /= this.signaturesService.scale;
        this.signaturesService.scale = 1;

    }

    resetDragPosition() {
        this.signaturesService.y = 0;
        this.signaturesService.x = 0;
        this.resetDragPos = true;
        setTimeout(() => {
            this.resetDragPos = false;
        }, 200);
    }

    prevPage() {
        this.pageNum--;
        this.pdfViewer.prevPage();
        this.getPdfImage();
        if (this.pageNum === 0) {
            this.pageNum = 1;
        } else {
        }

        if (this.currentDoc === 0) {
            this.signaturesService.currentPage = this.pageNum;
        }
    }

    nextPage() {
        if (this.pageNum >= this.totalPages) {
            this.pageNum = this.totalPages;
        } else {
            this.pageNum++;
        }
        this.pdfViewer.nextPage();
        this.getPdfImage();
        // only for main document
        if (this.currentDoc === 0) {
            this.signaturesService.currentPage = this.pageNum;
        }
    }

    nextDoc() {
        this.signaturesService.renderingDoc = true;
        this.signaturesService.isTaggable = false;
        this.pageNum = 1;
        this.currentDoc++;
        this.pdfRender(this.docList[this.currentDoc]);
        this.loadNextDoc();
    }

    prevDoc() {
        this.signaturesService.renderingDoc = true;
        this.pageNum = 1;
        this.currentDoc--;
        if (this.currentDoc === 0) {
            this.signaturesService.currentPage = 1;
            this.signaturesService.isTaggable = true;
        }
        this.pdfRender(this.docList[this.currentDoc]);
    }

    addAnnotation(e: any) {

        if (!this.signaturesService.annotationMode && this.currentDoc === 0) {

            const posX = e.srcEvent.layerX - this.signaturesService.x;
            const posY = e.srcEvent.layerY - this.signaturesService.y;

            this.signaturesService.x = -posX;
            this.signaturesService.y = -posY;
            this.zoomForNotes();
            $('.example-box').css({ 'transform': 'translate3d(' + -(posX) + 'px, ' + -(posY) + 'px, 0px)' });

            this.signaturesService.annotationMode = true;
            this.appDocumentNotePad.initPad();
        }
    }

    refuseDocument(): void {
        const dialogRef = this.dialog.open(WarnModalComponent, {
            width: '350px',
            data: {}
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result === 'sucess') {
                const config: MatBottomSheetConfig = {
                    disableClose: true,
                    direction: 'ltr'
                };
                this.bottomSheet.open(RejectInfoBottomSheetComponent, config);
                localStorage.removeItem(this.mainDocument.id.toString());
            } else if (result === 'annotation') {
                this.signaturesService.annotationMode = true;
                this.appDocumentNotePad.initPad();
            }
        });
    }

    validateDocument(mode: any): void {
        const dialogRef = this.dialog.open(ConfirmModalComponent, {
            width: '350px',
            data: { msg: 'lang.areYouSure' }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                const config: MatBottomSheetConfig = {
                    disableClose: true,
                    direction: 'ltr'
                };
                this.bottomSheet.open(SuccessInfoValidBottomSheetComponent, config);
                localStorage.removeItem(this.mainDocument.id.toString());
            }
        });
    }

    openDrawer(): void {
        if (this.currentDoc > 0) {
            this.currentDoc = 0;
            this.pageNum = 1;
            this.pdfRender(this.docList[this.currentDoc]);
        }
        this.signaturesService.showSign = true;
        this.signaturesService.showPad = false;
        const config: MatBottomSheetConfig = {
            disableClose: false,
            direction: 'ltr'
        };
        this.bottomSheet.open(SignaturesComponent, config);
    }

    removeTags() {
        this.signaturesService.currentAction = 0;
        const dialogRef = this.dialog.open(ConfirmModalComponent, {
            width: '350px',
            data: { msg: 'lang.deleteNoteAndSignature' }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.signaturesService.signaturesContent = [];
                this.signaturesService.notesContent = [];
                localStorage.removeItem(this.mainDocument.id.toString());
                this.notificationService.success('lang.noteAndSignatureDeleted');
            }
        });
    }

    loadNextDoc() {
        if (this.docList[this.currentDoc + 1] && this.docList[this.currentDoc + 1].id && this.docList[this.currentDoc + 1].encodedDocument === '') {
            this.http.get('../rest/attachments/' + this.docList[this.currentDoc + 1].id)
                .subscribe((dataPj: any) => {
                    this.docList[this.currentDoc + 1] = dataPj.attachment;
                }, (err: any) => {
                    this.notificationService.handleErrors(err);
                });
        }
    }

    launchEvent(action: any) {
        this.signaturesService.currentAction = action.id;
        this[action.event]();
    }

    undoTag() {
        if (this.signaturesService.notesContent[this.pageNum]) {
            this.signaturesService.notesContent[this.pageNum].pop();
            localStorage.setItem(this.mainDocument.id.toString(), JSON.stringify({ 'sign': this.signaturesService.signaturesContent, 'note': this.signaturesService.notesContent }));
        }
    }

    checkEmptyNote() {
        if (!this.signaturesService.notesContent[this.pageNum]) {
            return true;
        } else if (this.signaturesService.notesContent[this.pageNum] === 'undefined') {
            return true;
        } else if (this.signaturesService.notesContent[this.pageNum].length === 0) {
            return true;
        } else {
            return false;
        }
    }

    checkEmptiness() {
        let state = true;
        for (let pageNum = 1; pageNum <= this.signaturesService.totalPage; pageNum++) {
            if (this.signaturesService.notesContent[pageNum]) {
                if (this.signaturesService.notesContent[pageNum].length > 0) {
                    state = false;
                    break;
                }
            }
            if (this.signaturesService.signaturesContent[pageNum]) {
                if (this.signaturesService.signaturesContent[pageNum].length > 0) {
                    state = false;
                    break;
                }
            }
        }
        return state;
    }
}
