import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SignaturesContentService } from '../service/signatures.service';
import { MatBottomSheetRef } from '@angular/material';

@Component({
    templateUrl: 'success-info-valid.html',
    styleUrls: ['success-info-valid.scss']
})
export class SuccessInfoValidBottomSheetComponent implements OnInit {
    date: Date = new Date();
    constructor(private router: Router, public signaturesService: SignaturesContentService, private bottomSheetRef: MatBottomSheetRef<SuccessInfoValidBottomSheetComponent>) { }
     ngOnInit(): void {
        setTimeout(() => {
            if (this.signaturesService.documentsList[this.signaturesService.indexDocumentsList]) {
                this.router.navigate(['/documents/' + this.signaturesService.documentsList[this.signaturesService.indexDocumentsList].id]);
            } else {
                this.router.navigate(['/documents']);
            }
            this.bottomSheetRef.dismiss();
        }, 2000);
     }
}
