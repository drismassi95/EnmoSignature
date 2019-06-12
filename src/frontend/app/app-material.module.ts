import { NgModule } from '@angular/core';

import {
  MatSidenavModule,
  MatListModule,
  MatDialogModule,
  MatBottomSheetModule,
  MatRippleModule,
  MatSnackBarModule,
  MatButtonModule,
  MatIconModule,
  MatProgressSpinnerModule,
  MatCardModule,
  MatInputModule,
  MatExpansionModule,
  MatTabsModule,
  MatSliderModule,
  MatSelectModule,
  MatSlideToggleModule,
  MatBadgeModule,
  MatTableModule,
  MatPaginatorModule,
  MatSortModule,
  MatPaginatorIntl
} from '@angular/material';

import { MatMenuModule } from '@angular/material/menu';

import { DragDropModule } from '@angular/cdk/drag-drop';

import { getFrenchPaginatorIntl } from './plugins/paginator-fr-intl';

@NgModule({
  imports: [
      MatSidenavModule,
      MatListModule,
      MatDialogModule,
      MatBottomSheetModule,
      MatRippleModule,
      DragDropModule,
      MatSnackBarModule,
      MatButtonModule,
      MatIconModule,
      MatProgressSpinnerModule,
      MatCardModule,
      MatInputModule,
      MatExpansionModule,
      MatMenuModule,
      MatTabsModule,
      MatSliderModule,
      MatSelectModule,
      MatSlideToggleModule,
      MatBadgeModule,
      MatTableModule,
      MatPaginatorModule,
      MatSortModule
  ],
  exports: [
      MatSidenavModule,
      MatListModule,
      MatDialogModule,
      MatBottomSheetModule,
      MatRippleModule,
      DragDropModule,
      MatSnackBarModule,
      MatButtonModule,
      MatIconModule,
      MatProgressSpinnerModule,
      MatCardModule,
      MatInputModule,
      MatExpansionModule,
      MatMenuModule,
      MatTabsModule,
      MatSliderModule,
      MatSelectModule,
      MatSlideToggleModule,
      MatBadgeModule,
      MatTableModule,
      MatPaginatorModule,
      MatSortModule
  ],
  providers: [
      { provide: MatPaginatorIntl, useValue: getFrenchPaginatorIntl() },
  ]
})
export class AppMaterialModule { }
