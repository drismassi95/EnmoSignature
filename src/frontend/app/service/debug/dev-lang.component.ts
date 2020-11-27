import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { NotificationService } from '../notification.service';
import { TranslateService } from '@ngx-translate/core';


@Component({
    templateUrl: 'dev-lang.component.html',
    styleUrls: ['dev-lang.component.scss'],
})
export class DevLangComponent implements OnInit {
    allLang: any;

    missingLang: any =  {};

    currentLang = 'en';


    constructor(
        @Inject(MAT_DIALOG_DATA) public data: any,
        public dialogRef: MatDialogRef<DevLangComponent>,
        public http: HttpClient,
        private notify: NotificationService,
        private translate: TranslateService,
    ) {
    }

    ngOnInit(): void {
        this.getLangs();
    }

    getLangs() {
        this.http.get('../rest/languages').pipe(
            tap((data: any) => {
                this.allLang = data.languages;
                Object.keys(this.allLang).forEach(langName => {
                    this.missingLang[langName] = Object.keys(this.allLang.fr.lang).filter((keyLang: any) => Object.keys(this.allLang[langName].lang).indexOf(keyLang) === -1).map((keyLang: any) => {
                        return {
                            id: keyLang,
                            value: this.allLang.fr.lang[keyLang] + '__TO_TRANSLATE'
                        };
                    });
                });
            }),
            catchError((err: any) => {
                this.notify.handleErrors(err);
                return of(false);
            })
        ).subscribe();
    }

    openTranslation(text: string) {
        window.open('https://translate.google.fr/?hl=fr#view=home&op=translate&sl=fr&tl=' + this.currentLang + '&text=' + text.replace('__TO_TRANSLATE', ''), '_blank');
    }

    setActiveLang(ev: any) {
        this.currentLang = ev.detail.value;
    }

    generateMissingLang(ignoreToTranslate = false) {
        let newLang = {};
        let mergedLang = this.allLang[this.currentLang];
        const regex = /__TO_TRANSLATE$/g;

        this.missingLang[this.currentLang].forEach((element: any) => {
            if (element.value.match(regex) === null && ignoreToTranslate) {
                newLang[element.id] = element.value;
            } else if (!ignoreToTranslate) {
                newLang[element.id] = element.value;
            }
        });
        mergedLang = { ...mergedLang, ...newLang };

        this.http.put('../rest/languages', { langId: this.currentLang, jsonContent: mergedLang }).pipe(
            tap((data: any) => {
                Object.keys(newLang).forEach(keyLang => {
                    delete this.allLang[this.currentLang][keyLang];

                    this.missingLang[this.currentLang] = this.missingLang[this.currentLang].filter((missLang: any) => missLang.id !== keyLang);
                    this.data.countMissingLang--;
                });
                this.dialogRef.close(this.data.countMissingLang);
            }),
            catchError((err: any) => {
                this.notify.handleErrors(err);
                return of(false);
            })
        ).subscribe();
    }
}