import { Injectable } from '@angular/core';
import { Web3Service } from './web3.service';

import OneLeverageABI from './abi/OneLeverageABI.json';
import OneLeverageABI2 from './abi/OneLeverageABI2.json';
import HolderOneABI from './abi/HolderOneABI.json';
import FactoryABI from './abi/FactoryABI.json';

import { ConfigurationService } from './configuration.service';
import { BigNumber } from 'ethers/utils/bignumber';
import { ethers } from 'ethers';
import { ApolloClient } from 'apollo-client';
import { gql, HttpLink, InMemoryCache } from 'apollo-boost';
import { TokenService } from './token.service';

@Injectable({
    providedIn: 'root'
})
export class OneLeverageService {

    holderOneAaveCompoundContract;
    factory;
    client;

    constructor(
        protected web3Service: Web3Service,
        protected configurationService: ConfigurationService,
        protected tokenService: TokenService
    ) {

        this.init();
    }

    async init() {

        const cache = new InMemoryCache({
            resultCaching: false
        });

        const link = new HttpLink({
            uri: 'https://api.thegraph.com/subgraphs/name/1x-ag/subgraph'
        });

        this.client = new ApolloClient({
            cache,
            link
        });

        this.holderOneAaveCompoundContract = new (await this.web3Service.getWeb3Provider()).eth.Contract(
            // @ts-ignore
            HolderOneABI,
            this.configurationService.HOLDER_ONE_AAVE_COMPOUND
        );

        this.factory = new (await this.web3Service.getWeb3Provider()).eth.Contract(
            // @ts-ignore
            FactoryABI,
            this.configurationService.FACTORY_CONTRACT_ADDRESS
        );
    }

    getLeveregaTokenSymbol(
        collateralTokenSymbol: string,
        debtTokenSymbol: string,
        leverageRatio: number
    ) {

        return leverageRatio + 'x' + collateralTokenSymbol + debtTokenSymbol;
    }

    async getHolderContract(leverageProvider: string) {

        switch (leverageProvider) {

            case 'Compound':

                return this.holderOneAaveCompoundContract;
        }
    }

    async getFactory(): Promise<any> {

        // @ts-ignore
        return new Promise((resolve, reject) => {

            setTimeout(reject, 300000);

            const check = () => {

                if (this.factory) {

                    resolve(this.factory);
                    return;
                }

                setTimeout(() => {

                    check();
                }, 100);
            };

            check();
        });
    }

    async openPosition(
        collateralTokenSymbol: string,
        debtTokenSymbol: string,
        leverageRatio: number,
        leverageProvider: string,
        amount: BigNumber,
        stopLoss: number,
        takeProfit: number
    ): Promise<string> {

        const stopLossBN = ethers.utils.bigNumberify(1e9).sub(
            ethers.utils.bigNumberify(stopLoss * 10000).mul(1e9).div(1e2).div(10000)
        ).mul(1e9);

        const takeProfitBN = ethers.utils.bigNumberify(1e9).add(
            ethers.utils.bigNumberify(takeProfit * 10000).mul(1e9).div(1e2).div(10000)
        ).mul(1e9);

        const callData = (await this.getFactory()).methods.openPosition(
            (await this.getHolderContract(leverageProvider)).address,
            this.tokenService.getTokenBySymbol(collateralTokenSymbol).address,
            this.tokenService.getTokenBySymbol(debtTokenSymbol).address,
            leverageRatio,
            amount,
            1,
            stopLossBN,
            takeProfitBN
        )
            .encodeABI();

        const tx = this.web3Service.txProvider.eth.sendTransaction({
            from: this.web3Service.walletAddress,
            to: this.configurationService.FACTORY_CONTRACT_ADDRESS,
            value: debtTokenSymbol === 'ETH' ? amount : 0,
            gasPrice: this.configurationService.fastGasPrice,
            data: callData
        });

        return new Promise((resolve, reject) => {

            tx
                .once('transactionHash', async (hash) => {

                    resolve(hash);
                })
                .on('error', (err) => {

                    reject(err);
                });
        });
    }

    async closePosition(
        contractAddress: string
    ): Promise<string> {

        let abi;

        if (contractAddress.toString() === '0x7778d1011e19C0091C930d4BEfA2B0e47441562A'.toLowerCase()) {

            abi = OneLeverageABI;
        } else {

            abi = OneLeverageABI2;
        }

        const leverageContract = new (await this.web3Service.getWeb3Provider()).eth.Contract(
            // @ts-ignore
            abi,
            contractAddress
        );

        const callData = leverageContract.methods.closePosition(
            '0x0000000000000000000000000000000000000000'
        )
            .encodeABI();

        const tx = this.web3Service.txProvider.eth.sendTransaction({
            from: this.web3Service.walletAddress,
            to: leverageContract.address,
            value: 0,
            gasPrice: this.configurationService.fastGasPrice,
            data: callData
        });

        return new Promise((resolve, reject) => {

            tx
                .once('transactionHash', async (hash) => {

                    resolve(hash);
                })
                .on('error', (err) => {

                    reject(err);
                });
        });
    }

    async getOpenPositions(
        walletAddress: string,
        first: number = 100,
        skip: number = 0
    ) {

        const response = await this.client.query({
            query: gql`
                query {
                    positions(
                        where: {
                            owner:"${walletAddress}"
                            closed: false
                        }
                        first: ${first}
                        skip: ${skip}
                    ) {
                        id
                        contract
                        owner
                        amount
                        stopLoss
                        takeProfit
                        closed
                    }
                }
            `
        });

        return response['data']['positions'];
    }

    async getClosedPositions(
        walletAddress: string,
        first: number = 100,
        skip: number = 0
    ) {

        const response = await this.client.query({
            query: gql`
                query {
                    positions(
                        where: {
                            owner:"${walletAddress}"
                            closed: true
                        }
                        first: ${first}
                        skip: ${skip}
                    ) {
                        id
                        contract
                        owner
                        amount
                        stopLoss
                        takeProfit
                        closed
                    }
                }
            `
        });

        return response['data']['positions'];
    }
}
