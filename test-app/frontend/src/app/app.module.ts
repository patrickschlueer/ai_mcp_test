import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Feature Components
import { UserListComponent } from './features/users/components/user-list/user-list.component';
import { UserFilterComponent } from './features/users/components/user-filter/user-filter.component';
import { FilterPanelComponent } from './features/users/components/filter-panel/filter-panel.component';
import { QuickFilterBarComponent } from './features/users/components/quick-filter-bar/quick-filter-bar.component';
import { FilterBuilderComponent } from './features/users/components/filter-builder/filter-builder.component';
import { FilterPresetComponent } from './features/users/components/filter-preset/filter-preset.component';
import { UserTableComponent } from './features/users/components/user-table/user-table.component';

// Shared Components
import { SearchInputComponent } from './shared/components/search-input/search-input.component';
import { ButtonComponent } from './shared/components/button/button.component';
import { DropdownComponent } from './shared/components/dropdown/dropdown.component';
import { CheckboxComponent } from './shared/components/checkbox/checkbox.component';
import { DateRangePickerComponent } from './shared/components/date-range-picker/date-range-picker.component';
import { TagsInputComponent } from './shared/components/tags-input/tags-input.component';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component';
import { ErrorMessageComponent } from './shared/components/error-message/error-message.component';
import { ToastComponent } from './shared/components/toast/toast.component';

// NgRx Store
import { userReducer } from './features/users/store/user.reducer';
import { filterReducer } from './features/users/store/filter.reducer';
import { UserEffects } from './features/users/store/user.effects';
import { FilterEffects } from './features/users/store/filter.effects';

// Services
import { UserService } from './features/users/services/user.service';
import { FilterService } from './features/users/services/filter.service';
import { StorageService } from './shared/services/storage.service';
import { ErrorHandlingService } from './shared/services/error-handling.service';
import { SecurityService } from './shared/services/security.service';

// Pipes
import { HighlightSearchPipe } from './shared/pipes/highlight-search.pipe';
import { SanitizeHtmlPipe } from './shared/pipes/sanitize-html.pipe';
import { FilterCountPipe } from './shared/pipes/filter-count.pipe';
import { UserStatusPipe } from './features/users/pipes/user-status.pipe';

// Directives
import { AutofocusDirective } from './shared/directives/autofocus.directive';
import { ClickOutsideDirective } from './shared/directives/click-outside.directive';
import { InfiniteScrollDirective } from './shared/directives/infinite-scroll.directive';
import { AccessibilityDirective } from './shared/directives/accessibility.directive';

import { environment } from '../environments/environment';

@NgModule({
  declarations: [
    AppComponent,
    
    // Feature Components - Users
    UserListComponent,
    UserFilterComponent,
    FilterPanelComponent,
    QuickFilterBarComponent,
    FilterBuilderComponent,
    FilterPresetComponent,
    UserTableComponent,
    
    // Shared Components
    SearchInputComponent,
    ButtonComponent,
    DropdownComponent,
    CheckboxComponent,
    DateRangePickerComponent,
    TagsInputComponent,
    LoadingSpinnerComponent,
    ErrorMessageComponent,
    ToastComponent,
    
    // Pipes
    HighlightSearchPipe,
    SanitizeHtmlPipe,
    FilterCountPipe,
    UserStatusPipe,
    
    // Directives
    AutofocusDirective,
    ClickOutsideDirective,
    InfiniteScrollDirective,
    AccessibilityDirective
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    
    // NgRx Store Setup
    StoreModule.forRoot({
      users: userReducer,
      filters: filterReducer
    }, {
      metaReducers: [],
      runtimeChecks: {
        strictStateImmutability: true,
        strictActionImmutability: true,
        strictStateSerializability: true,
        strictActionSerializability: true
      }
    }),
    
    // NgRx Effects
    EffectsModule.forRoot([
      UserEffects,
      FilterEffects
    ]),
    
    // DevTools (only in development)
    StoreDevtoolsModule.instrument({
      maxAge: 25,
      logOnly: environment.production,
      autoPause: true,
      trace: false,
      traceLimit: 75
    })
  ],
  providers: [
    // Feature Services
    UserService,
    FilterService,
    
    // Shared Services
    StorageService,
    ErrorHandlingService,
    SecurityService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }