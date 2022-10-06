import { IOrdersRepo, OrderDiscount } from '../repositories/orders-repo';
import { delay } from '../utils/common';
import { OrderStatus } from '../utils/enums';

export interface IOrdersService {
    readonly REPO: IOrdersRepo;
    createOrder(flavour: string, orderId: number): Promise<number>;
    updateStatus(orderId: number, status: OrderStatus, delaySeconds: number): Promise<any>;
}

export class OrdersService implements IOrdersService {
    readonly REPO: IOrdersRepo;

    constructor(repo: IOrdersRepo) {
        this.REPO = repo;
    }

    public async createOrder(flavour: string, orderId: number): Promise<number> {
        const discount = this.calculateDiscount(flavour);

        const result = await this.REPO.createOrder(flavour, orderId, discount)
            .then(data => {
                console.log(data);
            });

        console.log(result);

        return orderId;
    }

    calculateDiscount(flavour: string): OrderDiscount {
        let response = {
            discountApplied: 0,
            discountReason: ''
        }

        let lowerFlavour = flavour.toLowerCase();
        if (lowerFlavour == 'pineapple' || lowerFlavour == 'hawaiian') {
            response.discountApplied = .20;
            response.discountReason = 'You like pineapple, you\'re one of us!';
        }

        return response;
    }

    public async updateStatus(orderId: number, status: OrderStatus, delaySeconds: number): Promise<any> {
        console.log(`updating orderId: ${orderId} to status: ${status}`);

        await this.REPO.updateStatus(orderId, status)
            .then(async data => {
                console.log(data);

                // add a delay after each status change (this delay could be 0)
                await delay(delaySeconds);
            }).catch(err => {
                // we don't want to throw errors when updating order status
                // if this fails it won't be the end of the world
                // the order can continue processing and the status might get updated once the next step is complete
            });

        return {
            status: 'ok'
        };

    }
}