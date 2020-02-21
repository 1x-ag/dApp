import { Injectable } from '@angular/core';
import { Contract } from 'web3-eth-contract';
import AggregatorABI from './abi/Aggregator.json';
import { Web3Service } from './web3.service';
import { BigNumber } from 'ethers/utils/bignumber';

const priceAggregatorAddresses = {
    ETH: {
        DAI: {
            aggregator: '0x037E8F2125bF532F3e228991e051c8A7253B642c',
            decimals: 1e18,
            flipPrice: true
        }
    },
    DAI: {
        ETH: {
            aggregator: '0x037E8F2125bF532F3e228991e051c8A7253B642c',
            decimals: 1e18,
            flipPrice: false
        }
    }
};

@Injectable({
    providedIn: 'root'
})
export class PriceAggregatorService {

    constructor(private web3Service: Web3Service) {

    }

    async getPriceByBlock(
        collateralTokenSymbol: string,
        debtTokenSymbol: string,
        blockNumber: string = 'latest'
    ): Promise<number> {

        const aggregatorParams = priceAggregatorAddresses[collateralTokenSymbol][debtTokenSymbol];
        const instance = await this.getAggregatorContract(aggregatorParams.aggregator);
        const price = await instance.methods.latestAnswer().call({}, blockNumber);

        if (aggregatorParams.flipPrice) {
            // todo: use normal BigNumber from bignumber.js lib
            // todo: wrap it to BN
            const flippedPriceBN = Math.pow(aggregatorParams.decimals, 2) / price.toNumber();
            return flippedPriceBN / aggregatorParams.decimals;
        }

        return price.toNumber() / aggregatorParams.decimals;
    }

    private async getAggregatorContract(contractAddress: string): Promise<Contract> {

        return new (await this.web3Service.getWeb3Provider()).eth.Contract(
            // @ts-ignore
            AggregatorABI,
            contractAddress
        );
    }
}
