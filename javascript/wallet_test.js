const { LNDWalletErrorCode, InvoiceState, PaymentStatus } = require("./enumsandcodes")
const Wallet = require("./wallet");
const assert = require("assert");

describe("Wallet", () => {
    const base_url = "http://localhost:80";
    const privkey = "b6afb2f946c9451f484948df67425325f3f11dfb52f4f5c531a2530246786cbe";
    const pubkey = "c7dd4213641cbf8daaad5ab89f6f1735ed8a0cc682be89f83a9d18680850a07d";
    let w1, address, invoice;

    before(() => {
        w1 = new Wallet(base_url, privkey, pubkey);
        w2 = new Wallet(base_url, privkey, pubkey);
    });

    it("Create new wallet address", async () => {
        address = await w1.newaddress();
        assert.deepEqual(address.errorCode, LNDWalletErrorCode.Ok);
    });

    it(`Add 10000 satoshis to current balance`, async () => {
        const sat = 10000;
        const balanceBefore = await w1.getbalance();
        await w1.topupandmine6blocks(address["value"], sat);
        const balanceAfter = await w1.getbalance();
        assert.deepEqual(balanceAfter.errorCode, LNDWalletErrorCode.Ok);
        assert.deepEqual(balanceAfter.value.availableAmount, balanceBefore.value.availableAmount + sat);
    });

    it("Add new invoice", async () => {
        const sat = 1000, memo = "test", expiry = 60;
        const invoices = await w2.listinvoices();
        assert.deepEqual(invoices.errorCode, LNDWalletErrorCode.Ok);
        invoice = await w2.addinvoice(sat, memo, expiry);
        assert.deepEqual(invoice.errorCode, LNDWalletErrorCode.Ok);
        assert.deepEqual(invoice.value.state, InvoiceState.Open);
        assert.deepEqual(invoice.value.satoshis, sat);
        assert.deepEqual(invoice.value.memo, memo);
        const invoicesAfter = await w2.listinvoices();
        assert.deepEqual(invoicesAfter.value.length, invoices.value.length + 1);
    });

    it("Send payment and check invoice status", async () => {
        const payment = await w1.sendpayment(invoice.value["paymentRequest"], 100, 1000);
        assert.deepEqual(payment.errorCode, LNDWalletErrorCode.Ok);
        assert.deepEqual(payment.value.status, PaymentStatus.Succeeded);
    });

    it("Check invoice status", async () => {
        const invoices = await w2.listinvoices();
        const inv = invoices.value.find(inv => inv.paymentRequest === invoice.value.paymentRequest);
        assert.deepEqual(inv.state, InvoiceState.Settled);
    });

});