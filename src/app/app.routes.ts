import { Routes } from '@angular/router';
import {
	businessInfoGuard,
	businessOnboardedGuard,
	businessOnboardingWizardGuard,
	homeVisitsGuard,
	onboardingGuard,
	ownerGuard,
	sessionGuard,
	staffGuard,
	superAdminGuard
} from './core/guards/session.guard';
import { OnboardingPageComponent } from './features/business/onboarding/onboarding.page';
import { BusinessShellPageComponent } from './features/business/business-shell/business-shell.page';
import { AppointmentsPageComponent } from './features/business/appointments/appointments.page';
import { ChatSessionPageComponent } from './features/business/chat-session/chat-session.page';
import { EmployeeHoursPageComponent } from './features/business/employees/employee-hours/employee-hours.page';
import { EmployeeServicesPageComponent } from './features/business/employees/employee-services/employee-services.page';
import { EmployeesListPageComponent } from './features/business/employees/employees-list/employees-list.page';
import { HomeVisitsPageComponent } from './features/business/home-visits/home-visits.page';
import { HoursPageComponent } from './features/business/hours/hours.page';
import { ServicesPageComponent } from './features/business/services/services.page';
import { SettingsPageComponent } from './features/business/settings/settings.page';
import { LoginPageComponent } from './features/auth/login/login.page';
import { RegisterPageComponent } from './features/auth/register/register.page';
import { ChatPageComponent } from './features/chat/chat.page';
import { EmployeeShellPageComponent } from './features/employee/employee-shell/employee-shell.page';
import { MyAppointmentsPageComponent } from './features/employee/appointments/my-appointments.page';
import { MyHoursPageComponent } from './features/employee/hours/my-hours.page';
import { MyServicesPageComponent } from './features/employee/services/my-services.page';
import { MyProfilePageComponent } from './features/employee/profile/my-profile.page';
import { RedeemCodePageComponent } from './features/onboarding/redeem-code/redeem-code.page';
import { AdminShellPageComponent } from './features/super-admin/admin-shell/admin-shell.page';
import { AnalyticsPageComponent } from './features/super-admin/analytics/analytics.page';
import { BusinessesPageComponent } from './features/super-admin/businesses/businesses.page';
import { UsersPageComponent } from './features/super-admin/users/users.page';

export const routes: Routes = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'auth/login'
	},
	{
		path: 'auth',
		children: [
			{
				path: 'login',
				component: LoginPageComponent
			},
			{
				path: 'registro',
				component: RegisterPageComponent
			}
		]
	},
	{
		path: 'onboarding/codigo',
		canActivate: [sessionGuard, onboardingGuard],
		component: RedeemCodePageComponent
	},
	{
		path: 'chat/:businessId',
		component: ChatPageComponent
	},
	{
		path: 'chat/:businessId/:employeeId',
		component: ChatPageComponent
	},
	{
		path: 'business/onboarding',
		canActivate: [sessionGuard, businessOnboardingWizardGuard],
		component: OnboardingPageComponent
	},
	{
		path: 'business',
		canActivate: [sessionGuard, ownerGuard, businessOnboardedGuard],
		component: BusinessShellPageComponent,
		children: [
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'appointments'
			},
			{
				path: 'appointments',
				canActivate: [businessInfoGuard],
				component: AppointmentsPageComponent
			},
			{
				path: 'services',
				canActivate: [businessInfoGuard],
				component: ServicesPageComponent
			},
			{
				path: 'home-visits',
				canActivate: [businessInfoGuard, homeVisitsGuard],
				component: HomeVisitsPageComponent
			},
			{
				path: 'hours',
				canActivate: [businessInfoGuard],
				component: HoursPageComponent
			},
			{
				path: 'employees',
				canActivate: [businessInfoGuard],
				component: EmployeesListPageComponent
			},
			{
				path: 'employees/:employeeId/hours',
				canActivate: [businessInfoGuard],
				component: EmployeeHoursPageComponent
			},
			{
				path: 'employees/:employeeId/services',
				canActivate: [businessInfoGuard],
				component: EmployeeServicesPageComponent
			},
			{
				path: 'settings',
				component: SettingsPageComponent
			},
			{
				path: 'chat/:sessionId',
				component: ChatSessionPageComponent
			}
		]
	},
	{
		path: 'admin',
		canActivate: [sessionGuard, superAdminGuard],
		component: AdminShellPageComponent,
		children: [
			{
				// Pantalla principal del super admin: la analitica de la plataforma.
				path: '',
				pathMatch: 'full',
				component: AnalyticsPageComponent
			},
			{
				path: 'negocios',
				component: BusinessesPageComponent
			},
			{
				path: 'usuarios',
				component: UsersPageComponent
			},
			{
				path: '**',
				redirectTo: ''
			}
		]
	},
	{
		path: 'employee',
		canActivate: [sessionGuard, staffGuard],
		component: EmployeeShellPageComponent,
		children: [
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'appointments'
			},
			{
				path: 'appointments',
				component: MyAppointmentsPageComponent
			},
			{
				path: 'hours',
				component: MyHoursPageComponent
			},
			{
				path: 'services',
				component: MyServicesPageComponent
			},
			{
				path: 'profile',
				component: MyProfilePageComponent
			}
		]
	},
	{
		path: '**',
		redirectTo: 'auth/login'
	}
];
