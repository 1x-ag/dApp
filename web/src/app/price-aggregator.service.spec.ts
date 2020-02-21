import { TestBed } from '@angular/core/testing';

import { PriceAggregatorService } from './price-aggregator.service';

describe('PriceAggregatorService', () => {
  let service: PriceAggregatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PriceAggregatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
