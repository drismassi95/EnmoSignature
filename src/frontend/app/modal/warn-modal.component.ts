
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { SignaturesContentService } from '../service/signatures.service';
import { NotificationService } from '../service/notification.service';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';

@Component({
    templateUrl: 'warn-modal.component.html',
    styleUrls: ['warn-modal.component.scss']
})
export class WarnModalComponent {
    disableState = false;
    msgButton = 'lang.rejectDocument';

    constructor(private translate: TranslateService, @Inject(MAT_DIALOG_DATA) public data: any, public http: HttpClient, public dialogRef: MatDialogRef<WarnModalComponent>, public signaturesService: SignaturesContentService, public notificationService: NotificationService) { }

    confirmDoc () {
        const signatures: any[] = [];
        if (this.signaturesService.currentAction > 0) {
            for (let index = 1; index <= this.signaturesService.totalPage; index++) {
                if (this.signaturesService.signaturesContent[index]) {
                    this.signaturesService.signaturesContent[index].forEach((signature: any) => {
                        signatures.push(
                            {
                                'encodedImage'  : signature.encodedSignature,
                                'width'         : signature.width,
                                'positionX'     : signature.positionX,
                                'positionY'     : signature.positionY,
                                'type'          : 'PNG',
                                'page'          : index
                            }
                        );
                    });
                }
                if (this.signaturesService.notesContent[index]) {
                    this.signaturesService.notesContent[index].forEach((note: any) => {
                        signatures.push(
                            {
                                'encodedImage'  : note.fullPath.replace('data:image/png;base64,', ''),
                                'width'         : note.width,
                                'positionX'     : note.positionX,
                                'positionY'     : note.positionY,
                                'type'          : 'PNG',
                                'page'          : index
                            }
                        );
                    });
                }
            }
            this.disableState = true;
            this.msgButton = 'lang.sending';
            this.http.put('../rest/documents/' + this.signaturesService.mainDocumentId + '/actions/' + this.signaturesService.currentAction, {'signatures': signatures})
                .subscribe(() => {
                    if (this.signaturesService.documentsList[this.signaturesService.indexDocumentsList] !== undefined) {
                        var mode = this.signaturesService.documentsList[this.signaturesService.indexDocumentsList]["mode"];
                        this.signaturesService.documentsList.splice(this.signaturesService.indexDocumentsList, 1);
                        
                        if (this.signaturesService.documentsListCount[mode] > 0) {
                            this.signaturesService.documentsListCount[mode]--;
                        }
                    }
                    this.disableState = false;
                    this.msgButton = 'lang.rejectDocument';
                    this.dialogRef.close('sucess');
                }, (err: any) => {
                    this.notificationService.handleErrors(err);
                    this.disableState = false;
                    this.msgButton = 'lang.rejectDocument';
                });
        } else {
            this.dialogRef.close('sucess');
        }
    }
}
