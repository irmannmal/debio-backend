import { Logger, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ServiceRequestStakingAmountIncreasedCommand } from './service-request-partial.command';
import { TransactionLoggingDto } from '../../../../../common/modules/transaction-logging/dto/transaction-logging.dto';
import {
  DateTimeProxy,
  NotificationService,
  TransactionLoggingService,
} from '../../../../../common';
import { NotificationDto } from '../../../../../common/modules/notification/dto/notification.dto';

@Injectable()
@CommandHandler(ServiceRequestStakingAmountIncreasedCommand)
export class ServiceRequestStakingAmountIncreasedHandler
  implements ICommandHandler<ServiceRequestStakingAmountIncreasedCommand>
{
  private readonly logger: Logger = new Logger(
    ServiceRequestStakingAmountIncreasedCommand.name,
  );

  constructor(
    private readonly loggingService: TransactionLoggingService,
    private readonly notificationService: NotificationService,
    private readonly dateTimeProxy: DateTimeProxy,
  ) {}

  async execute(command: ServiceRequestStakingAmountIncreasedCommand) {
    await this.logger.log('Service Request Staking Amount Excess Refunded!');
    const serviceRequest = command.request;
    const loggingServiceRequest = await this.loggingService.getLoggingByOrderId(
      serviceRequest[1],
    );

    const stakingLogging: TransactionLoggingDto = {
      address: serviceRequest[0].toString(),
      amount: serviceRequest[2].toString(),
      created_at: this.dateTimeProxy.new(),
      currency: 'DBIO',
      parent_id: loggingServiceRequest.id,
      ref_number: serviceRequest[1].toString(),
      transaction_status: 10,
      transaction_type: 2,
    };

    try {
      const isServiceRequestHasBeenInsert =
        await this.loggingService.getLoggingByHashAndStatus(
          serviceRequest.hash,
          10,
        );
      if (!isServiceRequestHasBeenInsert) {
        await this.loggingService.create(stakingLogging);
      }

      const currDateTime = this.dateTimeProxy.new();

      const notificationInput: NotificationDto = {
        role: 'Customer',
        entity_type: 'ServiceRequest',
        entity: 'ServiceRequestStakingAmountIncreased',
        description: `Your partial payment staking service request with ID ${serviceRequest[1]} has been increased.`,
        read: false,
        created_at: currDateTime,
        updated_at: currDateTime,
        deleted_at: null,
        from: null,
        to: serviceRequest.requesterAddress,
      };

      await this.notificationService.insert(notificationInput);
    } catch (error) {
      await this.logger.log(error);
    }
  }
}
