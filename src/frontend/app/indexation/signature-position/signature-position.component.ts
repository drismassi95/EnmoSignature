import { Component, Input, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { NgxExtendedPdfViewerService } from 'ngx-extended-pdf-viewer';
import { NotificationService } from '../../service/notification.service';
import { ModalController } from '@ionic/angular';

@Component({
    templateUrl: 'signature-position.component.html',
    styleUrls: ['signature-position.component.scss'],
})
export class SignaturePositionComponent implements OnInit {

    @Input() workflow: any = [];
    @Input() signPos: any = [];
    @Input() pdfContent: any = null;

    loading: boolean = false;

    pages: number[] = [];

    currentUser: number = 0;
    currentPage: number = 0;
    currentSignature: any = {
        positionX: 0,
        positionY: 0
    };

    workingAreaWidth: number = 0;
    workingAreaHeight: number = 0;
    signList: any[] = [];

    imgContent: any = null;

    constructor(
        public translate: TranslateService,
        public http: HttpClient,
        private notify: NotificationService,
        private pdfViewerService: NgxExtendedPdfViewerService,
        public modalController: ModalController

    ) { }

    ngOnInit(): void {
        if (this.signPos !== undefined) {
            this.initSignPos();
        }
    }

    initSignPos() {
        this.signPos.forEach((element: any) => {
            this.signList.push({
                sequence: element.sequence,
                page: element.page,
                position: element.position
            });
        });
    }

    onSubmit() {
        this.modalController.dismiss(this.formatData());
    }

    async onPagesLoaded(ev: any) {
        this.pages = Array.from({ length: ev.pagesCount }).map((_, i) => i + 1);
        this.changePage(1);
    }

    public async exportAsImage(): Promise<void> {
        const scale = { width: 1000 };
        const data = await this.pdfViewerService.getPageAsImage(this.currentPage, scale);
        this.getImageDimensions(data);
        this.imgContent = data;
    }

    getImageDimensions(imgContent: any): void {
        const img = new Image();
        img.onload = (data: any) => {
            this.workingAreaWidth = data.target.naturalWidth;
            this.workingAreaHeight = data.target.naturalHeight;
        };
        img.src = imgContent;
    }

    changePage(page: number) {
        this.currentPage = page;
        this.exportAsImage();
    }

    moveSign(event: any, i: number) {
        const percentx = (event.x * 100) / this.workingAreaWidth;
        const percenty = (event.y * 100) / this.workingAreaHeight;
        this.signList.filter((item: any) => item.sequence === this.currentUser && item.page === this.currentPage)[0].position.positionX = percentx;
        this.signList.filter((item: any) => item.sequence === this.currentUser && item.page === this.currentPage)[0].position.positionY = percenty;
    }

    emptySign() {
        return this.signList.filter((item: any) => item.sequence === this.currentUser && item.page === this.currentPage).length === 0;
    }

    initSign() {
        this.signList.push(
            {
                sequence: this.currentUser,
                page: this.currentPage,
                position: {
                    positionX: 0,
                    positionY: 0
                }
            }
        );
        document.getElementsByClassName('signatureContainer')[0].scrollTo(0, 0);
    }

    getUserSignPosPage(workflowIndex: number) {
        return this.signList.filter((item: any) => item.sequence === workflowIndex);
    }

    selectUser(workflowIndex: number) {
        this.currentUser = workflowIndex;
    }

    getUserName(workflowIndex: number) {
        return this.workflow[workflowIndex].userDisplay;
    }

    goToSignUserPage(workflowIndex: number, page: number) {
        this.currentUser = workflowIndex;
        this.currentPage = page;
        this.exportAsImage();
    }

    deleteSign(index: number) {
        this.signList.splice(index, 1);
    }

    formatData() {
        let objToSend: any[] = [];
        this.workflow.forEach((element: any, index: number) => {
            if (this.signList.filter((item: any) => item.sequence === index).length > 0) {
                objToSend = objToSend.concat(this.signList.filter((item: any) => item.sequence === index));
            }
        });
        return objToSend;
    }
}
