import { Invoice } from '../../models';

export default interface IInvoiceRepository {
  /**
   * @param invoice The invoice object that needs to be saved in DB
   * @returns An instance of Invoice
   */
  createInvoice(invoice: Invoice): Promise<Invoice>;
  /**
   * @param invoice The invoice object that needs to be updated in DB
   * @returns An instance of updated Invoice
   */
  updateInvoice(invoice: Invoice): Promise<Invoice>;
  /**
   * @param invoiceID The invoice ID
   * @returns Invoice object
   */
  getInvoiceByID(invoiceID: string): Promise<Invoice>;
}