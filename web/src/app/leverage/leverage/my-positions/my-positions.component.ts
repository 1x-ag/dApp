import { Component, OnDestroy, OnInit, TemplateRef } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap';
import { LeverageChartDialogComponent } from '../leverage-chart-dialog/leverage-chart-dialog.component';
import { mockedPositions } from './mocked-positions';
import { OneLeverageService } from '../../../one-leverage.service';
import { Web3Service } from '../../../web3.service';
import { OnPageHidden, OnPageVisible } from 'angular-page-visibility';
import { faSyncAlt } from '@fortawesome/free-solid-svg-icons';

export interface IPosition {
    assetAmount: number;
    initialRates2Usd: number;
    tokenName: string;
    profit: string;
    status: string;
    stopLossUsd: number;
    stopWinUsd: number;
    leverage: number;
    ratesHistory: Array<{ rate: number, t: string }>;
}

@Component({
    selector: 'app-my-positions',
    templateUrl: './my-positions.component.html',
    styleUrls: ['./my-positions.component.scss']
})
export class MyPositionsComponent implements OnInit, OnDestroy {
    // TODO: make mocks more stupid,
    //  add parameters calculation, to dot this calcaulation logic to shared service
    positions = mockedPositions;
    modalRef: BsModalRef;

    loading = true;

    openPositions;
    closedPositions;
    selectedPosition: any;
    transactionHash = '';
    error = false;
    done = false;
    timer;
    destroyed = false;
    sync = true;
    refreshIcon = faSyncAlt;

    constructor(
        private modalService: BsModalService,
        private oneLeverageService: OneLeverageService,
        private web3Service: Web3Service
    ) {
        //
    }

    @OnPageVisible()
    logWhenPageVisible(): void {

        // console.log('OnPageVisible => visible');
        this.sync = true;
    }

    @OnPageHidden()
    logWhenPageHidden(): void {

        // console.log('OnPageHidden => hidden');
        this.sync = false;
    }

    async ngOnInit() {
        // ---

        setTimeout(() => {

            this.web3Service.connectEvent.subscribe(value => {

                this.loadPositions();
            });

            this.runBackgroundJobs();
        }, 5000);

        await this.loadPositions();
        this.loading = false;
    }

    async loadPositions(background: boolean = false) {

        try {

            if (!background) {

                this.loading = true;
            }

            this.openPositions = (await this.oneLeverageService.getOpenPositions(
                this.web3Service.walletAddress
            )).map(position => {

                return {
                    contract: position.contract,
                    tokenName: 'ETH / DAI',
                    assetAmount: 2,
                    //
                    initialRates2Usd: 267.67,
                    profit: '130%',
                    status: 'healthy',
                    stopLossUsd: 50,
                    stopWinUsd: 1100,
                    leverage: 2,
                    ratesHistory: [
                        { rate: 267.67, t: '10:00' },
                        { rate: 280.67, t: '11:00' },
                        { rate: 290.67, t: '12:00' },
                        { rate: 264.03, t: '13:00' },
                        { rate: 236.79, t: '14:00' },
                        { rate: 224.15, t: '15:00' },
                        { rate: 228.29, t: '16:00' },
                        { rate: 223.30, t: '17:00' },
                        { rate: 223.28, t: '18:00' },
                        { rate: 212.73, t: '19:00' },
                        { rate: 203.86, t: '20:00' },
                        { rate: 188.84, t: '21:00' },
                        { rate: 189.86, t: '22:00' },
                        { rate: 188.55, t: '23:00' },
                        { rate: 183.34, t: '00:00' },
                        { rate: 179.23, t: '01:00' },
                        { rate: 184.73, t: '02:00' },
                        { rate: 173.71, t: '03:00' },
                        { rate: 175.19, t: '04:00' },
                        { rate: 169.74, t: '05:00' },
                        { rate: 167.65, t: '06:00' },
                        { rate: 160.67, t: '07:00' },
                        { rate: 162.41, t: '08:00' },
                        { rate: 162.52, t: '09:00' },
                        { rate: 167.83, t: '10:00' }
                    ]
                };
            });

            // console.log('openPositions', this.openPositions);

            this.closedPositions = await this.oneLeverageService.getClosedPositions(
                this.web3Service.walletAddress
            );

            // console.log('closedPositions', this.closedPositions);
        } catch (e) {

            console.error(e);
        }

        if (!background) {

            this.loading = false;
        }
    }

    operate(position: any, template: TemplateRef<any>) {

        this.selectedPosition = position;
        this.modalRef = this.modalService.show(template, { class: 'modal-sm' });
    }

    async confirm() {

        try {

            this.transactionHash = await this.oneLeverageService.closePosition(
                this.selectedPosition.contract
            );

            this.done = true;
        } catch (e) {

            this.error = true;
            console.error(e);
        }

        this.modalRef.hide();
    }

    decline(): void {

        this.modalRef.hide();
    }

    showChartDialog(position: IPosition) {
        const initialState: any = {
            ...position,
            src2DstAssetRates: position.ratesHistory.map((x) => x.rate),
            rates2Usd: position.ratesHistory
        };
        //
        this.modalRef = this.modalService.show(LeverageChartDialogComponent, { class: 'modal-lg', initialState });
    }

    async runBackgroundJobs() {

        const startTime = (new Date()).getTime();

        try {

            if (this.sync) {

                const promises = [];

                if (
                    this.web3Service.walletAddress
                ) {

                    promises.push(
                        this.loadPositions(true)
                    );
                }

                await Promise.all(promises);
            }
        } catch (e) {

            console.error(e);
        }

        try {

            if (
                (new Date()).getTime() - startTime > 10000
            ) {

                this.runBackgroundJobs();
            } else {

                this.timer = setTimeout(() => {

                    if (!this.destroyed) {

                        this.runBackgroundJobs();
                    }
                }, 10000 - ((new Date()).getTime() - startTime));
            }
        } catch (e) {

            console.error(e);
        }
    }

    ngOnDestroy(): void {

        this.destroyed = true;

        if (this.timer) {

            clearTimeout(this.timer);
        }
    }

    async refresh() {

        this.loading = true;
        await this.loadPositions(true);

        setTimeout(() => {
            this.loading = false;
        }, 200);
    }
}
