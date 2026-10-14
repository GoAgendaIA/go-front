import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BusinessSettings } from '../../../core/models/goagenda.models';
import { GoagendaApiService } from '../../../core/services/goagenda-api.service';
import { BusinessAddressFormComponent } from './business-address-form.component';

const NEGOCIO: BusinessSettings = { name: 'Barberia', phone_number: '3001112233', reminder_hours_before: 2 };

function crear(settings: BusinessSettings = NEGOCIO) {
  const api = {
    getBusinessSettings: vi.fn().mockReturnValue(of(settings)),
    updateBusinessAddress: vi.fn().mockReturnValue(of({ ...settings, address: 'x' }))
  };
  TestBed.configureTestingModule({ providers: [{ provide: GoagendaApiService, useValue: api }] });
  const fixture = TestBed.createComponent(BusinessAddressFormComponent);
  fixture.componentRef.setInput('businessId', 'biz-1');
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, api };
}

describe('BusinessAddressFormComponent', () => {
  it('carga la direccion guardada', async () => {
    const { component } = crear({
      ...NEGOCIO,
      address: 'Vereda La Cita, despues del puente',
      address_kind: 'referencias',
      address_lat: 6.2,
      address_lng: -75.5
    });
    await Promise.resolve();
    expect(component.form.controls.address.value).toBe('Vereda La Cita, despues del puente');
    expect(component.form.controls.kind.value).toBe('referencias');
    expect(component.mapUrl).toContain('6.2,-75.5');
  });

  it('exige la direccion y no llama al servidor si esta vacia o en blanco', async () => {
    const { component, api } = crear();
    component.form.controls.address.setValue('   ');
    expect(await component.save()).toBe(false);
    expect(api.updateBusinessAddress).not.toHaveBeenCalled();
    expect(component.addressError).toContain('obligatoria');
  });

  it('acepta texto libre sin imponer formato y manda los opcionales como null', async () => {
    const { component, api } = crear();
    component.form.patchValue({ address: '  Finca El Mirador km 4, via al rio  ', city: '  ', notes: '' });
    expect(await component.save()).toBe(true);
    expect(api.updateBusinessAddress).toHaveBeenCalledWith({
      business_id: 'biz-1',
      address: 'Finca El Mirador km 4, via al rio',
      address_kind: 'formal',
      address_city: null,
      address_notes: null,
      address_lat: null,
      address_lng: null
    });
  });

  it('quita la ubicacion del mapa', async () => {
    const { component } = crear({ ...NEGOCIO, address: 'Calle 1', address_lat: 6.2, address_lng: -75.5 });
    await Promise.resolve();
    component.clearLocation();
    expect(component.mapUrl).toBeNull();
  });

  it('informa el error del servidor sin avanzar', async () => {
    const { component, api } = crear();
    api.updateBusinessAddress.mockReturnValue(throwError(() => new Error('500')));
    component.form.patchValue({ address: 'Calle 1' });
    expect(await component.save()).toBe(false);
    expect(component.error()).toContain('No se pudo guardar');
  });
});
