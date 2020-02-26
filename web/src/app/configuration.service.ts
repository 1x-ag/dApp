import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class ConfigurationService {

    public ONE_SPLIT_CONTRACT_ADDRESS = '0xDFf2AA5689FCBc7F479d8c84aC857563798436DD';
    public TOKEN_HELPER_CONTRACT_ADDRESS = '0x1ed7221c4a43632e3ed491a8a28bbebd0b450ad8';
    public ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

    public HOLDER_ONE_AAVE_COMPOUND = '0xed0bf34c458a3ece0c741e394d87a155a56a1758';
    public FACTORY_CONTRACT_ADDRESS = '0x07ab6a35bbb1f1002a3db3747085c6280294f352';

    public CONTRACT_ENS = '1xAggregator.eth';

    public GAS_PRICE_URL = 'http://gas-price.api.enterprise.1inch.exchange';
    public GAS_PRICE_URL2 = 'https://gasprice.poa.network';
    public CORS_PROXY_URL = 'https://corsproxy.1inch.exchange/';

    public fastGasPrice = new ethers.utils.BigNumber(Math.trunc(6 * 100)).mul(1e7);
    public standardGasPrice = new ethers.utils.BigNumber(Math.trunc(11 * 100)).mul(1e7);
    public instantGasPrice = new ethers.utils.BigNumber(Math.trunc(21 * 100)).mul(1e7);

    constructor(
        private http: HttpClient
    ) {

        setInterval(() => {

            try {

                this.setGasPrices();
            } catch (e) {

            }
        }, 30000);

        this.setGasPrices();
    }

    async setGasPrices() {

        try {

            let result;

            try {

                result = await this.http.get(this.CORS_PROXY_URL + this.GAS_PRICE_URL).toPromise();
            } catch (e) {

            }

            let fastGasPrice,
                standardGasPrice,
                instantGasPrice;

            if (!result || !result['health']) {

                result = await this.http.get(this.GAS_PRICE_URL2).toPromise();
            }

            fastGasPrice = result['fast'] * 110 * 1e9 / 100;
            standardGasPrice = result['standard'] * 110 * 1e9 / 100;
            instantGasPrice = result['instant'] * 110 * 1e9 / 100;

            this.fastGasPrice = ethers.utils.bigNumberify(Math.trunc(fastGasPrice));
            this.standardGasPrice = ethers.utils.bigNumberify(Math.trunc(standardGasPrice));
            this.instantGasPrice = ethers.utils.bigNumberify(Math.trunc(instantGasPrice));
        } catch (e) {

            // console.error(e);
        }
    }
}
