import { inject, injectable } from 'inversify';
import { JsonSerializer } from 'typescript-json-serializer';
import { v4 as UUIDv4 } from 'uuid';
import {
  IController as IProcessPaymentController,
  IConfig as IProcessPaymentConfig,
  IResult as IProcessPaymentResult,
} from '../../controllers/interfaces/process-payment';
import {
  IEmailService,
  IInvoiceService,
  IPaymentService,
} from '../../services/interfaces';
import { Response } from '../../dto/billing-api/customer/id/payments/POST';
import TYPES from '../../inversify/types';
import CustomError from '../../utils/custom-error';
import { Payment } from '../../models';

enum ErrorCodes {
  FORBIDDEN_ERROR = 'error.billing-api.process-payment.forbidden',
  APPLICATION_ERROR = 'error.billing-api.process-payment.application-error',
}

@injectable()
export default class Controller implements IProcessPaymentController {
  private result!: IProcessPaymentResult;

  private invoiceService!: IInvoiceService;

  private paymentService!: IPaymentService;

  private emailService!: IEmailService;

  constructor(
    @inject(TYPES.ProcessPaymentResult)
    result: IProcessPaymentResult,
    @inject(TYPES.InvoiceService)
    invoiceService: IInvoiceService,
    @inject(TYPES.PaymentService)
    paymentService: IPaymentService,
    @inject(TYPES.EmailService)
    emailService: IEmailService
  ) {
    this.result = result;
    this.invoiceService = invoiceService;
    this.paymentService = paymentService;
    this.emailService = emailService;
  }

  async process(config: IProcessPaymentConfig): Promise<IProcessPaymentResult> {
    try {
      const request = config.getRequest();
      const validationResult = request.validate();
      if (validationResult.error) {
        console.log('Validation Error');
        throw new CustomError(
          ErrorCodes.FORBIDDEN_ERROR,
          `Validation of request failed with message: ${validationResult.error.message}`
        );
      }
      const jsonSerializer = new JsonSerializer();

      /** Make a call here to Payment Service which processes payment. If success then proceed forward.
       * Eg. Stripe, Braintree, Paypal. */

      const invoiceID = request.getInvoiceID();
      const paymentID = UUIDv4();
      const payment = new Payment();
      payment.build(
        paymentID,
        invoiceID,
        request.getPaymentMethod(),
        request.getAmount(),
        config.getCustomerID()
      );

      await this.paymentService.createPayment(payment);

      const invoice = await this.invoiceService.getInvoiceByID(invoiceID);

      // Ideally, moment library should be used for date time values
      const createdAt = new Date().toISOString();

      // update invoice status
      invoice.setIsPaid(true);
      invoice.setPaymentDate(createdAt);

      const response = jsonSerializer.deserializeObject(
        request,
        Response
      ) as Response;

      response.build('COMPLETED', paymentID, createdAt);
      this.result.build(response);
    } catch (error) {
      console.error('ProcessPaymentController.process() Error:', error);
      this.emailService.sendEmail(
        'Payment Failure',
        'Your payment with transaction ID: xxxxx has failed. Please wait for some time before retrying.',
        'frommail@test.com',
        'tomail@test.com'
      );
      throw error;
    }
    return this.result;
  }
}