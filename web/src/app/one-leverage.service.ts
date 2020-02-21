import { Injectable } from '@angular/core';
import { Web3Service } from './web3.service';

import OneLeverageABI from './abi/OneLeverageABI.json';
import HolderOneABI from './abi/HolderOneABI.json';
import { ConfigurationService } from './configuration.service';
import { BigNumber } from 'ethers/utils/bignumber';
import { ethers } from 'ethers';
import { ApolloClient } from 'apollo-client';
import { gql, HttpLink, InMemoryCache } from 'apollo-boost';

@Injectable({
    providedIn: 'root'
})
export class OneLeverageService {

    holderOneAaveCompoundContract;
    client;

    constructor(
        protected web3Service: Web3Service,
        protected configurationService: ConfigurationService
    ) {

        this.init();
    }

    async init() {

        const cache = new InMemoryCache();
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
    }

    async getTokenContract(leverageTokenSymbol: string) {

        switch (leverageTokenSymbol) {

            case '2xETHDAI':

                return new (await this.web3Service.getWeb3Provider()).eth.Contract(
                    // @ts-ignore
                    OneLeverageABI,
                    this.configurationService.ETHDAI2x
                );

            case '2xDAIETH':

                return new (await this.web3Service.getWeb3Provider()).eth.Contract(
                    // @ts-ignore
                    OneLeverageABI,
                    this.configurationService.DAIETH2x
                );
        }
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

    async openPosition(
        collateralTokenSymbol: string,
        debtTokenSymbol: string,
        leverageRatio: number,
        leverageProvider: string,
        amount: BigNumber,
        stopLoss: number,
        takeProfit: number
    ): Promise<string> {

        const leverageSymbol = leverageRatio + 'x' + collateralTokenSymbol + debtTokenSymbol;
        const leverageContract = await this.getTokenContract(leverageSymbol);

        const stopLossBN = ethers.utils.bigNumberify(1e9).sub(
            ethers.utils.bigNumberify(stopLoss * 10000).mul(1e9).div(1e2).div(10000)
        ).mul(1e9);

        const takeProfitBN = ethers.utils.bigNumberify(1e9).add(
            ethers.utils.bigNumberify(takeProfit * 10000).mul(1e9).div(1e2).div(10000)
        ).mul(1e9);

        const callData = leverageContract.methods.openPosition(
            amount,
            (await this.getHolderContract(leverageProvider)).address,
            stopLossBN,
            takeProfitBN
        )
            .encodeABI();

        const tx = this.web3Service.txProvider.eth.sendTransaction({
            from: this.web3Service.walletAddress,
            to: leverageContract.address,
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
