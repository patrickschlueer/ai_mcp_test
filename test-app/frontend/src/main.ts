import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { importProvidersFrom } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { userReducer } from './app/store/user/user.reducer';
import { filterReducer } from './app/store/filter/filter.reducer';
import { UserEffects } from './app/store/user/user.effects';
import { FilterEffects } from './app/store/filter/filter.effects';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideStore({
      users: userReducer,
      filters: filterReducer
    }),
    provideEffects([UserEffects, FilterEffects]),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: false,
      autoPause: true,
      trace: false,
      traceLimit: 75
    }),
    importProvidersFrom(HttpClientModule)
  ]
}).catch(err => console.error(err));