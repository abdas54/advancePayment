sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox"

],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, MessageToast, Fragment, MessageBox) {
        "use strict";
        var that;
        return Controller.extend("com.eros.advancepayment.controller.AdvPaymentCancel", {
            onInit: function () {
                that = this;
                $("body").css("zoom", "90%");
                this.getView().byId("page").setVisible(false);
                this.oModel = this.getOwnerComponent().getModel();
                this.oModel.setSizeLimit(1000);
                this.customerAddressModel = new JSONModel();
                this.getView().setModel(this.customerAddressModel, "custAddModel");

                this.customerModel = this.getOwnerComponent().getModel("customerService");
                this.getView().setModel(this.customerModel, "CustomerModel");

                var showSection = new JSONModel();
                showSection.setData({
                    "selectedMode": ""
                });
                this.getView().setModel(showSection, "ShowSection");

                var model3 = new JSONModel();
                model3.setData({
                    "selectedMode": "",
                    "cardPaymentMode": 0
                });
                this.getView().setModel(model3, "ShowPaymentSection");
                this.validateLoggedInUser();
                this.shippingMethod = "";
                this.paymentEntSourceCounter = 0;
                this.paymentId = 0;
                this.sourceIdCounter = 0;
                this.aPaymentEntries = [];
                this.cashierID ="";
                this.CashierPwd="";
            },
             enableValidateBtn: function(oEvent){
                if(oEvent.getSource().getId() === "cashId"){
                    this.cashierID = oEvent.getSource().getValue();
                }
                else if(oEvent.getSource().getId() === "casPwd"){
                    this.CashierPwd = oEvent.getSource().getValue();
                }

                
                if(this.cashierID.length > 0 && this.CashierPwd.length > 0){
                    sap.ui.getCore().byId("validatebtn").setEnabled(true);
                }
                else{
                    sap.ui.getCore().byId("validatebtn").setEnabled(false);
                }
            },
            validateLoggedInUser: function () {
                var that = this;
                this.oModel.read("/StoreIDSet", {
                    success: function (oData) {
                        that.storeID = oData.results[0] ? oData.results[0].Store : "";
                        that.plantID = oData.results[0] ? oData.results[0].Plant : "";
                        that.onPressPayments();
                    },
                    error: function (oError) {
                        sap.m.MessageBox.show(JSON.parse(oError.responseText).error.message.value, {
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: [MessageBox.Action.OK],
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.OK) {
                                    window.history.go(-1);
                                }
                            }
                        });
                    }
                });
            },
            onPressPayments: function () {
                if (!this._oDialogCashier) {
                    Fragment.load({
                        name: "com.eros.advancepayment.fragment.cashier",
                        controller: this
                    }).then(function (oFragment) {
                        this._oDialogCashier = oFragment;
                        this.getView().addDependent(this._oDialogCashier);
                        this._oDialogCashier.open();
                    }.bind(this));
                } else {
                    this._oDialogCashier.open();
                }
            },
            fnCloseCashier: function () {
                this._oDialogCashier.close();
            },
            fnValidateCashier: function (oEvent) {
                var that = this;
                that.getView().byId("page").setVisible(false);
                var empId = oEvent.getSource().getParent().getContent()[0].getItems()[0].getContent()[1].getValue();
                var pwd = oEvent.getSource().getParent().getContent()[0].getItems()[0].getContent()[3].getValue();
                var aFilters = [];

                aFilters.push(new sap.ui.model.Filter("Etype", sap.ui.model.FilterOperator.EQ, "C"));
                aFilters.push(new sap.ui.model.Filter("EmployeeId", sap.ui.model.FilterOperator.EQ, empId));
                aFilters.push(new sap.ui.model.Filter("SecretCode", sap.ui.model.FilterOperator.EQ, pwd));
                aFilters.push(new sap.ui.model.Filter("Generate", sap.ui.model.FilterOperator.EQ, "N"));
                //EmployeeSet?$filter=Etype eq 'C' and EmployeeId eq '112' and SecretCode eq 'Abc#91234'

                this.oModel.read("/EmployeeSet", {
                    filters: aFilters,
                    success: function (oData) {
                        that.cashierID = oData.results[0] ? oData.results[0].EmployeeId : "";
                        that.cashierName = oData.results[0] ? oData.results[0].EmployeeName : "";
                        that._oDialogCashier.close();
                        that.getView().byId("cashier").setCount(oData.results[0].EmployeeName);
                        that.getView().byId("tranNumber").setCount(oData.results[0].TransactionId);
                        that.getView().byId("page").setVisible(true);

                    },
                    error: function (oError) {
                        that.getView().byId("page").setVisible(false);
                        if (JSON.parse(oError.responseText).error.code === "CASHIER_CHECK") {
                            sap.m.MessageBox.show(
                                JSON.parse(oError.responseText).error.message.value, {
                                icon: sap.m.MessageBox.Icon.Error,
                                title: "Cashier Validation",
                                actions: ["OK", "CANCEL"],
                                onClose: function (oAction) {

                                }
                            }
                            );
                        }
                        else {
                            sap.m.MessageBox.show(
                                JSON.parse(oError.responseText).error.message.value, {
                                icon: sap.m.MessageBox.Icon.Error,
                                title: "Error",
                                actions: ["OK", "CANCEL"],
                                onClose: function (oAction) {

                                }
                            }
                            );
                        }
                        console.error("Error", oError);
                    }
                });

            },
            onPressCustData: function () {
                var oModel = new sap.ui.model.json.JSONModel({
                    customerData: [{
                        option: "Basic Information"
                    }, {
                        option: "Customer Address"
                    }]
                });
                this.getView().setModel(oModel, "CustModel");
                if (!this._oDialogCust) {
                    Fragment.load({
                        name: "com.eros.advancepayment.fragment.customer",
                        controller: this
                    }).then(function (oFragment) {
                        this._oDialogCust = oFragment;
                        this.getView().addDependent(this._oDialogCust);
                        this._oDialogCust.open();
                    }.bind(this));
                } else {
                    this._oDialogCust.open();
                }

            },
            onPressCustClose: function () {
                this._oDialogCust.close();
            },
            onPressCustSaveClose: function () {
                this.shippingAddress = "";
                this.shippingDate = "";
                this.shippingInst = "";

                var custData = this.getView().getModel("custAddModel").getData();
                var bFlag = this.validateCustomer();
                var addressParts = [];
                var customerName = [];

                if (custData.ShippingMethod === 0) {
                    this.shippingMethod = "HD";
                } else if (custData.ShippingMethod === 1) {
                    this.shippingMethod = "HA";
                } else if (custData.ShippingMethod === 2) {
                    this.shippingMethod = "HP";
                }

                if (custData.FirstName) {
                    customerName.push(custData.FirstName);
                }
                if (custData.LastName) {
                    customerName.push(custData.LastName);
                }
                var custName = customerName.join(" ");
                this.getView().byId("customer").setCount(custName);
                var selAddIndex = sap.ui.getCore().byId("addressRbGrp").getSelectedIndex();
                if (selAddIndex === 0) {

                    if (custData.HomeAddressLine1) {
                        addressParts.push(custData.HomeAddressLine1);
                    }
                    if (custData.HomeAddressLine2) {
                        addressParts.push(custData.HomeAddressLine2);
                    }
                    if (custData.HomeStreet) {
                        addressParts.push(custData.HomeStreet);
                    }
                    if (custData.HomeCity) {
                        addressParts.push(custData.HomeCity);
                    }
                    if (custData.HomeCountry) {
                        addressParts.push(custData.HomeCountry);
                    }

                }
                else if (selAddIndex === 1) {

                    if (custData.OfficeAddressLine1) {
                        addressParts.push(custData.OfficeAddressLine1);
                    }
                    if (custData.OfficeAddressLine2) {
                        addressParts.push(custData.OfficeAddressLine2);
                    }
                    if (custData.OfficeStreet) {
                        addressParts.push(custData.OfficeStreet);
                    }
                    if (custData.off_City) {
                        addressParts.push(custData.OfficeCity);
                    }
                    if (custData.off_Country) {
                        addressParts.push(custData.OfficeCountry);
                    }



                } else {

                    if (custData.OtherAddressLine1) {
                        addressParts.push(custData.OtherAddressLine1);
                    }
                    if (custData.OtherAddressLine2) {
                        addressParts.push(custData.OtherAddressLine2);
                    }
                    if (custData.oth_po) {
                        addressParts.push(custData.OtherStreet);
                    }
                    if (custData.oth_City) {
                        addressParts.push(custData.OtherCity);
                    }
                    if (custData.oth_Country) {
                        addressParts.push(custData.OtherCountry);
                    }



                }
                this.shippingAddress = addressParts.join(" ");



                if (custData.shippingDate) {
                    var date = new Date(custData.shippingDate);
                    var pad = (n) => String(n).padStart(2, '0');
                    // this.shippingDate = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
                    this.shippingDate = custData.shippingDate;
                }

                if (custData.ShippingInst) {
                    this.shippingInst = custData.ShippingInst;
                }



                if (bFlag) {
                    this.updateCustomer();
                }

                // this._oDialogCust.close();

            },
            validateCustomer: function () {
                var bFlag;

                var custData = this.getView().getModel("custAddModel").getData();
                var errorMessage = "";

                // Basic Required Fields
                if (!custData.FirstName || custData.FirstName.trim() === "") {
                    errorMessage += "First Name is required.\n";
                }
                if (!custData.Code || custData.Code.trim() === "") {
                    errorMessage += "Country Code is required.\n";
                }
                if (!custData.Mobile || custData.Mobile.trim() === "") {
                    errorMessage += "Mobile Number is required.\n";
                }
                if (!custData.CustomerType || custData.CustomerType.trim() === "") {
                    errorMessage += "Customer Type is required.\n";
                }

             



                // Show message if there are errors
                if (errorMessage.length > 0) {
                    sap.m.MessageBox.error(errorMessage);
                    bFlag = false;
                }
                else {
                    bFlag = true;
                }

                return bFlag;


            },
            updateCustomer: function () {
                var that = this;
                var data = this.getView().getModel("custAddModel").getData();


                var birthDate = sap.ui.getCore().byId("birthDate").getValue();
      

                if (birthDate) {
                    data.BirthDate = new Date(birthDate);
                }
                else {
                    data.BirthDate = null;
                }
               
                    data.IdentityExpiry = null;
              
                this.oModel.create("/CustomerSet", data, {
                    success: function (oData) {
                        that._oDialogCust.close();
                        sap.m.MessageToast.show("Customer Update Successfully");
                    },
                    error: function (oError) {
                        sap.m.MessageToast.show("Error while Updating Customer");

                    }
                });

            },
            onOptionSelect: function (oEvent) {
                var sSelectedOption = oEvent.getSource().getTitle();
                var showSection = new JSONModel();
                showSection.setData({
                    "selectedMode": sSelectedOption
                });
                this.getView().setModel(showSection, "ShowSection");
                //	sap.m.MessageToast.show("Selected: " + sSelectedOption);
            },
            onSearchNumber: function (oEvent) {
                var that = this;
                var searchNumber = oEvent.getParameter("query");
                var aFilters = [];

                aFilters.push(new sap.ui.model.Filter("Mobile", sap.ui.model.FilterOperator.EQ, searchNumber));
                this.oModel.read("/CustomerSet", {
                    filters: aFilters,
                    success: function (oData) {
                        if (oData) {

                            if (oData.results.length > 0) {
                                // this.getView().setModel(oModel1, "AddressModel");
                                that.getView().getModel("custAddModel").setData({});
                                that.getView().getModel("custAddModel").setData(oData.results[0]);
                                that.getView().getModel("custAddModel").refresh();
                                that.getView().getModel("ShowSection").setProperty("/selectedMode", "Basic Information");

                                if ((oData.HomeAddressLine1 !== "") || (oData.HomeAddressLine2 !== "")) {
                                    sap.ui.getCore().byId("addressRbGrp").setSelectedIndex(0);
                                }
                                else if ((oData.OfficeAddressLine1 !== "") || (oData.OfficeAddressLine2 !== "")) {
                                    sap.ui.getCore().byId("addressRbGrp").setSelectedIndex(1);

                                }
                                else if ((oData.OtherAddressLine1 !== "") || (oData.OtherAddressLine2 !== "")) {
                                    sap.ui.getCore().byId("addressRbGrp").setSelectedIndex(2);

                                }
                                else {
                                    sap.ui.getCore().byId("addressRbGrp").setSelectedIndex(0);
                                }


                            }
                            else {
                                that.showCustomerNotExistMessage();
                            }

                        }
                    },
                    error: function (oError) {
                        that.showCustomerNotExistMessage();
                    }
                });
            },
            showCustomerNotExistMessage: function () {
                sap.m.MessageBox.show("Customer does not exist. Kindly add it", {
                    icon: sap.m.MessageBox.Icon.Error,
                    title: "Error",
                    actions: [MessageBox.Action.OK],
                    onClose: function (oAction) {
                        if (oAction === MessageBox.Action.OK) {
                            that.getView().getModel("custAddModel").setData({});
                            that.getView().getModel("ShowSection").setProperty("/selectedMode", "Basic Information");
                        }
                    }
                });
            },
            onSelectAddressType: function (oEvent) {
                if (oEvent.getParameter("selectedIndex") === 0) {
                    sap.ui.getCore().byId("homeSection").setVisible(true);
                    sap.ui.getCore().byId("workSection").setVisible(false);
                    sap.ui.getCore().byId("otherSection").setVisible(false);
                }
                if (oEvent.getParameter("selectedIndex") === 1) {
                    sap.ui.getCore().byId("homeSection").setVisible(false);
                    sap.ui.getCore().byId("workSection").setVisible(true);
                    sap.ui.getCore().byId("otherSection").setVisible(false);
                }
                if (oEvent.getParameter("selectedIndex") === 2) {
                    sap.ui.getCore().byId("homeSection").setVisible(false);
                    sap.ui.getCore().byId("workSection").setVisible(false);
                    sap.ui.getCore().byId("otherSection").setVisible(true);
                }
            },
            onCustomerTypeChange: function (oEvent) {
                var that = this;

                if (oEvent.getParameter("selectedItem").getProperty("key") === "TOURIST") {
                   
                    that.getView().getModel("custAddModel").setProperty("/Code", "");
                }
                else {
                    
                    that.getView().getModel("custAddModel").setProperty("/Code", "971");
                }

            },
            validCustomer: function () {
                var entered = this.getView().byId("customer").getCount();
                if (entered) {
                    return true;
                }
                else {
                    return false
                }

            },
            onPressPayments1: function () {
                var checkCustomer = this.validCustomer();
                if (checkCustomer) {

                    var oModel = new sap.ui.model.json.JSONModel({
                        totalAmount: "0.00",
                        paymentOptions: [{
                            option: "Cash"
                        }, {
                            option: "Card"
                        }, {
                            option: "Non-GV"
                        },
                        {
                            option: "EGV"
                        },{
                            option :"View All Records"
                        }]
                    });
                    this.getView().setModel(oModel, "PaymentModel");

                    var cashData = [{
                        denomination: "",
                        qty: 0,
                        total: 0
                    }];

                    var oModel1 = new JSONModel({
                        "cashData": cashData,
                        "grandTotal": 0
                    });
                    this.getView().setModel(oModel1, "CashModel");

                    if (!this._oDialogPayment) {
                        Fragment.load({
                            name: "com.eros.advancepayment.fragment.payment",
                            controller: this
                        }).then(function (oFragment) {
                            this._oDialogPayment = oFragment;
                            this.getView().getModel("ShowPaymentSection").setProperty("/selectedMode","");
                            sap.ui.getCore().byId("totalAmountText").setText(parseFloat(that.getView().byId("inpAdvanceReciept").getValue()).toFixed(2));
                            this.getView().addDependent(this._oDialogPayment);
                            sap.ui.getCore().byId("cashSbmtBtn").setEnabled(true);
                            this._oDialogPayment.open();
                            this._oDialogCashier.close();
                        }.bind(this));
                    } else {
                        this.getView().getModel("ShowPaymentSection").setProperty("/selectedMode","");
                        sap.ui.getCore().byId("cashSbmtBtn").setEnabled(true);
                        this._oDialogPayment.open();
                        sap.ui.getCore().byId("totalAmountText").setText(parseFloat(that.getView().byId("inpAdvanceReciept").getValue()).toFixed(2));
                        this._oDialogCashier.close();
                    }
                }
                else {
                    MessageBox.error("Kindly enter Customer Details");
                }
            },
            onOptionSelectPayment: function (oEvent) {
                var sSelectedOption = oEvent.getSource().getTitle();
                var showSection = new JSONModel();
                showSection.setData({
                    "selectedMode": sSelectedOption,
                    "cardPaymentMode": 0
                });
                if (sSelectedOption === "Cash") {
                    var cashModel = new JSONModel();
                    cashModel.setData({
                        "cash": [
                            {
                                "title": "1000",
                                "subtitle": "sap-icon://credit-card"
                            },
                            {
                                "title": "500",
                                "subtitle": "sap-icon://credit-card"
                            },
                            {
                                "title": "200",
                                "subtitle": "sap-icon://credit-card"
                            },
                            {
                                "title": "100",
                                "subtitle": "sap-icon://credit-card"
                            },
                            {
                                "title": "50",
                                "subtitle": "sap-icon://credit-card"
                            },
                            {
                                "title": "20",
                                "subtitle": "sap-icon://credit-card"
                            }


                        ]
                    })
                }
                this.getView().setModel(cashModel, "cashCurrencyModel");
                this.getView().setModel(showSection, "ShowPaymentSection");
                if (this.getView().getModel("GiftVoucher")) {
                    this.getView().getModel("GiftVoucher").setData({});
                    sap.ui.getCore().byId("gvPaymentList").setVisible(false);
                    sap.ui.getCore().byId("giftVoucher").setValue("");
                }
                 if (sSelectedOption === "View All Records"){
                    this.getView().getModel("ShowPaymentSection").setProperty("/allEntries",this.aPaymentEntries)
                }
            },
            onPressClose: function () {
                this._oDialogPayment.close();
            },
            onCashSubmit: function (oEvent) {
                var event = oEvent.getSource();
                var cashAmount = sap.ui.getCore().byId("cash").getValue();
                this.paymentEntSourceCounter = this.paymentEntSourceCounter + 1;
                this.paymentId = this.paymentId + 1;
                var bFlag = false;
                var maxcount = "";
                // if (this.aPaymentEntries.length > 0) {
                //     for (var count = 0; count < this.aPaymentEntries.length; count++) {

                //         if (this.aPaymentEntries[count].PaymentMethodName === "Cash") {
                //             bFlag = true;
                //             maxcount = count;
                //             break;

                //         }
                //     }
                // }
                if (cashAmount !== 0 && cashAmount !== "0.00") {

                    // if (bFlag) {
                    //     this.aPaymentEntries[maxcount].Amount = parseFloat(this.aPaymentEntries[maxcount].Amount) + parseFloat(cashAmount)
                    // }
                    // else {
                        this.aPaymentEntries.push({
                            "TransactionId": this.getView().byId("tranNumber").getCount().toString(),
                            "PaymentId": this.paymentId.toString(),
                            "PaymentDate": new Date(),
                            "Amount": cashAmount.toString(),
                            "Currency": "AED",
                            "PaymentMethod": "011", //Cash( 011), card ("")
                            "PaymentMethodName": "Cash",
                            "Tid": "",
                            "Mid": "",
                            "CardType": "",
                            "CardLabel": "",
                            "CardNumber": "",
                            "AuthorizationCode": "",
                            "CardReceiptNo": "",
                            "PaymentType": "CASH",
                            "VoucherNumber": "",
                            "SourceId": "" //this.getView().byId("tranNumber").getCount().toString() + this.paymentEntSourceCounter.toString()


                        });
                    // }

                    var saleAmount = sap.ui.getCore().byId("totalAmountText").getText();
                    var paidAmount = 0;
                    for (var count1 = 0; count1 < this.aPaymentEntries.length; count1++) {

                        paidAmount = parseFloat(parseFloat(this.aPaymentEntries[count1].Amount) + parseFloat(paidAmount)).toFixed(2);

                    }
                    var balanceAmount = parseFloat(parseFloat(saleAmount).toFixed(2) - parseFloat(paidAmount).toFixed(2)).toFixed(2);
                    if (balanceAmount <= 0) {
                        sap.ui.getCore().byId("totaltenderBal").setText(balanceAmount);
                        sap.ui.getCore().byId("totalSaleBalText").setText("0.00");
                        sap.ui.getCore().byId("sbmtTrans").setVisible(true);
                        event.setEnabled(false);
                        sap.m.MessageToast.show("Cash Payment Successful");
                        that.onPressPaymentTest();
                    }
                    else {
                        sap.ui.getCore().byId("totalSaleBalText").setText(parseFloat(Math.abs(balanceAmount)).toFixed(2));
                        sap.ui.getCore().byId("cash").setValue("");
                        sap.ui.getCore().byId("sbmtTrans").setVisible(false);
                        sap.m.MessageToast.show("Cash Payment Successful");
                    }



                    //var tenderChangeAmount = this.getView().byId("totaltenderBal").getValue();

                }
            },
            onPressPaymentTest: function () {
                this.onPressPayment(true);
            },
            getTimeInISO8601Format: function () {
                const now = new Date();
                const hours = now.getHours();      // 24-hour format
                const minutes = now.getMinutes();
                const seconds = now.getSeconds();

                return `PT${hours}H${minutes}M${seconds}S`;
            },
            onPressPayment: function (bflag) {

                var mode = "1";
                var delDate = new Date();
                //var shippingMode = this.checkHomeDelivery();
                var custData = this.getView().getModel("custAddModel").getData();
                var contactNumber = "";
                custData.Code ? custData.Code : "" + custData.Mobile ? custData.Mobile : ""
                if (custData.Code) {
                    contactNumber = contactNumber + custData.Code;
                }
                if (custData.Mobile) {
                    contactNumber = contactNumber + custData.Mobile;
                }

                var that = this;
                var oPayload = {
                    "TransactionId": this.getView().byId("tranNumber").getCount().toString(),
                    "TransactionDate": new Date(),//new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                    "ExpiryDate": new Date(),
                    "TransactionTime": this.getTimeInISO8601Format(),//new Date().toTimeString().slice(0, 8).replace(/:/g, ''),
                    "TransactionStatus": mode,
                    "SalesOrder": "",
                    "Flag": "",
                    "Store": that.storeID,
                    "Plant": that.plantID,
                    "CashierId": that.cashierID,
                    "CashierName": that.cashierName,
                    "TransactionType": "3",
                    "ShippingMethod": this.shippingMethod,
                    "GrossAmount": "0.00",
                    "Discount": "0.00",
                    "VatAmount": "0.00",
                    "SaleAmount": this.getView().byId("inpAdvanceReciept").getValue().toString(),
                    "Currency": "AED",
                    "OriginalTransactionId": "", // Required for Return Sales
                    "CustomerName": this.getView().byId("customer").getCount().toString(),
                    "ContactNo": contactNumber,
                    "EMail": this.getView().getModel("custAddModel").getData().Email,
                    "Address": this.shippingAddress,
                    "ShippingInstruction": "",
                    "DeliveryDate": new Date(),
                    "ToItems": { "results": [] },
                    "ToDiscounts": { "results": [] },
                    "ToPayments": { "results": this.oPayloadPayments(this.aPaymentEntries) },
                    "ToSerials": { "results": [] },
                    "Remarks": this.getView().byId("comments").getValue(),
                    "ToSignature": { "results": this.oPaySignatureload },
                    "CustomerType": that.oPayload.CustomerType,
                    // "ToPayments" : {"results" : this.oPayloadTablePayments()}
                }
                this.getView().setBusy(true);
                this._oDialogPayment.setBusy(true);
                this.oModel.create("/SalesTransactionHeaderSet", oPayload, {
                    success: function (oData) {
                        that.getView().setBusy(false);
                        that._oDialogPayment.setBusy(false);
                        that.getView().byId("tranNumber").setCount(oData.TransactionId);
                        
                        MessageBox.success("Advance Payment Posted Successfully.", {
                            onClose: function (sAction) {
                                window.location.reload(true);
                            }
                        });
                    },
                    error: function (oError) {
                        that.getView().setBusy(false);
                        that._oDialogPayment.setBusy(false);
                        sap.m.MessageToast.show("Error");
                    }
                });

            },
            onRetrieveTerminal: function (oEvent) {
                this.cashAmount = oEvent.getParameter("value");
                var that = this;
                var aFilters = [];
                aFilters.push(new sap.ui.model.Filter("Store", sap.ui.model.FilterOperator.EQ, this.storeID));
                this.oModel.read("/TerminalsSet", {
                    filters: aFilters,
                    success: function (oData) {
                        that.getView().getModel("ShowPaymentSection").setProperty("/Terminal", []);
                        that.getView().getModel("ShowPaymentSection").setProperty("/Terminal", oData.results);

                    },
                    error: function (oError) {
                        sap.m.MessageBox.show(JSON.parse(oError.responseText).error.message.value, {
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: [MessageBox.Action.OK],
                            onClose: function (oAction) {
                                if (oAction === MessageBox.Action.OK) {

                                }
                            }
                        });
                    }
                });
            },
            onPressTenderCard: function (oEvent) {
                // var terminalID = oEvent.getParameter("srcControl").getAggregation("items")[0].getProperty("text")
                // var machindID = oEvent.getParameter("srcControl").getAggregation("items")[1].getProperty("text");

                var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
                var oVBox = oItem.getContent ? oItem.getContent()[0] : oItem.getAggregation("content")[0];
                var aItems = oVBox.getItems ? oVBox.getItems() : oVBox.getAggregation("items");
                var terminalID = aItems[0]?.getText();
                var machineID = aItems[1]?.getText();
                this.initiateTransaction(terminalID, machineID);
            },
            initiateTransaction: function (termID, machID) {
                var that = this;
                sap.ui.core.BusyIndicator.show();
                // BusyDialog.open();
                var oPayload = {
                    "Tid": termID,
                    "Mid": machID,
                    "TransactionType": "pushPaymentSale",
                    "SourceId": this.getView().byId("tranNumber").getCount().toString() + this.sourceIdCounter.toString(),
                    "Amount": this.cashAmount.toString()

                }

                this.oModel.create("/PaymentStartTransactionSet", oPayload, {
                    success: function (oData) {
                        that.sourceIdCounter = that.sourceIdCounter + 1;
                        that.paymentEntSourceCounter = that.paymentEntSourceCounter + 1;
                        sap.ui.getCore().byId("creditAmount").setValue("");
                        that.getView().getModel("ShowPaymentSection").setProperty("/Terminal", []);
                        that.getView().getModel("ShowPaymentSection").refresh();
                        sap.ui.core.BusyIndicator.hide();
                        that.paymentId = that.paymentId + 1;
                        that.getView().setBusy(false);
                        that.aPaymentEntries.push({
                            "TransactionId": that.getView().byId("tranNumber").getCount().toString(),
                            "PaymentId": that.paymentId.toString(),
                            "PaymentDate": new Date(),
                            "Amount": oData.Amount,
                            "Currency": "AED",
                            "PaymentMethod": "",
                            "PaymentMethodName": "Card",
                            "Tid": oData.Tid,
                            "Mid": oData.Mid,
                            "CardType": oData.CardType,
                            "CardLabel": oData.CardLabel,
                            "CardNumber": oData.CardNumber,
                            "AuthorizationCode": oData.AuthorizationCode,
                            "CardReceiptNo": oData.CardReceiptNo,
                            "PaymentType": "CARD",
                            "VoucherNumber": "",
                            "SourceId": that.getView().byId("tranNumber").getCount().toString() + that.paymentEntSourceCounter.toString()


                        });

                        var saleAmount = sap.ui.getCore().byId("totalAmountText").getText();
                        var paidAmount = 0;
                        for (var count1 = 0; count1 < that.aPaymentEntries.length; count1++) {

                            paidAmount = parseFloat(parseFloat(that.aPaymentEntries[count1].Amount) + parseFloat(paidAmount)).toFixed(2);

                        }
                        var balanceAmount = parseFloat(parseFloat(saleAmount).toFixed(2) - parseFloat(paidAmount).toFixed(2)).toFixed(2);
                        if (balanceAmount <= 0) {
                            sap.ui.getCore().byId("totaltenderBal").setText(balanceAmount);
                            sap.ui.getCore().byId("totalSaleBalText").setText("0.00");
                            sap.ui.getCore().byId("sbmtTrans").setVisible(true);
                            that.onPressPaymentTest();
                        }
                        else {
                            sap.ui.getCore().byId("totalSaleBalText").setText(parseFloat(Math.abs(balanceAmount)).toFixed(2));
                            sap.ui.getCore().byId("cash").setValue("");
                            sap.ui.getCore().byId("sbmtTrans").setVisible(false);
                        }


                        sap.m.MessageToast.show("Card Payment Successful");

                    },
                    error: function (oError) {
                        that.sourceIdCounter = that.sourceIdCounter + 1;
                        var errMessage = "";
                        sap.ui.core.BusyIndicator.hide();
                        if (JSON.parse(oError.responseText).error.message.value) {
                            errMessage = JSON.parse(oError.responseText).error.message.value;
                        }
                        else {
                            errMessage = "Error During Payment Transaction "
                        }

                        sap.m.MessageBox.show(errMessage, {
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: [MessageBox.Action.OK],
                            onClose: function (oAction) {

                            }
                        });


                    }
                });
            },
            onSelectCardType: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("listItem").getBindingContext().getObject();
                this.selectedCardData = oSelectedItem;
                this.selectedCardType = oSelectedItem.CardType;
                this.selectedCardPayMethodName = oSelectedItem.PaymentMethodName;
                this.selectedCardPayMethod = oSelectedItem.PaymentMethod;

                this._oDialogCardType = null;
                if (!this._oDialogCardType) {
                    this._oDialogCardType = new sap.m.Dialog({
                        title: this.selectedCardType,
                        content: [],
                        beginButton: new sap.m.Button({
                            text: "Submit",
                            press: this.onSubmitCardType.bind(this)
                        }),
                        endButton: new sap.m.Button({
                            text: "Cancel",
                            press: function () {
                                this._oDialogCardType.close();
                            }.bind(this)
                        })
                    });
                    this._oAmountCardInput = new sap.m.Input({
                        placeholder: "Enter Amount",
                        type: "Number",
                        width: "60%"
                    }).addStyleClass("sapUiSmallMarginBegin  sapUiSmallMarginTop sapUiSmallMarginBottom");

                    this._oSelectCardLabel = new sap.m.Input({
                        placeholder: "Enter Card Label",
                        width: "60%"
                    }).addStyleClass("sapUiSmallMarginBegin  sapUiTinyMarginTop sapUiSmallMarginBottom");

                    this._oSelectCardApproval = new sap.m.Input({
                        placeholder: "Enter Approval Code",
                        width: "60%"
                    }).addStyleClass("sapUiSmallMarginBegin  sapUiTinyMarginTop sapUiSmallMarginBottom");

                    this._oSelectCardReciept = new sap.m.Input({
                        placeholder: "Enter Card Reciept Number",
                        width: "60%"
                    }).addStyleClass("sapUiSmallMarginBegin  sapUiTinyMarginTop sapUiSmallMarginBottom");

                    this._oDialogCardType.addContent(this._oAmountCardInput);
                    this._oDialogCardType.addContent(this._oSelectCardLabel);
                    this._oDialogCardType.addContent(this._oSelectCardApproval);
                    this._oDialogCardType.addContent(this._oSelectCardReciept);
                    this.getView().addDependent(this._oDialogCardType);
                }

                // Clear previous input
                this._oAmountCardInput.setValue("");
                this._oSelectCardLabel.setValue("");
                this._oSelectCardApproval.setValue("");
                this._oSelectCardReciept.setValue("");

                this._oDialogCardType.open();
                // sap.ui.getCore().byId("manCardAmount").setValue("");
                // sap.ui.getCore().byId("manCardNumber").setValue("");
                // sap.ui.getCore().byId("manCardApproveCode").setValue("");
                // sap.ui.getCore().byId("manCardReciept").setValue("");
            },
            onPressCancel: function(){
                var that = this;
                var oPayload = this.oPayload;
                this.oPayload.Remarks = this.getView().byId("comments").getValue();
         
                    this.oModel.create("/SalesTransactionHeaderSet", oPayload, {
                    success: function (oData) {
                        that.getView().setBusy(false);
                         that._pAddRecordDialog.then(
                    function (oValueHelpDialog) {
                        
                        oValueHelpDialog.setBusy(false);
                    }.bind(that)
                );
                        that.getView().byId("tranNumber").setCount(oData.TransactionId);
                        MessageBox.success("Advance Payment Cancelled Successfully.", {
                            onClose: function (sAction) {
                                window.location.reload(true);
                            }
                        });
                    },
                    error: function (oError) {
                        that.getView().setBusy(false);
                        that._oDialogPayment.setBusy(false);
                        sap.m.MessageToast.show("Error");
                    }
                });
            },
            onSearch: function(){
                var recieptNumber = this.getView().byId("inpAdvanceReciept").getValue();
                 var aFilters = [];

                aFilters.push(new sap.ui.model.Filter("TransactionId", sap.ui.model.FilterOperator.EQ, recieptNumber));
                aFilters.push(new sap.ui.model.Filter("TransactionType", sap.ui.model.FilterOperator.EQ, "3"));
                 this.oModel.read("/SalesTransactionHeaderSet", {
                    filters :aFilters,
                    urlParameters: {
                        "$expand": "ToItems,ToDiscounts,ToPayments,ToSerials"
                    },

                    success: function (oData) {
                        if(oData){
                            that.oPayload = oData.results[0];
                            that.getView().byId("advPaymenttab").setVisible(true);
                            that.getView().byId("saleAmountIcon").setCount(oData.results[0].SaleAmount);
                            that.getView().byId("tabAmount").setText(oData.results[0].SaleAmount);
                            that.getView().byId("tabCustomer").setText(oData.results[0].CustomerName);
                             that.getView().byId("customer").setCount(oData.results[0].CustomerName);
                            that.getView().byId("tabRemarks").setText(oData.results[0].Remarks);


                        }
                    },
                    error: function (oError) {
                        sap.m.MessageBox.show(
                            JSON.parse(oError.responseText).error.message.value, {
                            icon: sap.m.MessageBox.Icon.Error,
                            title: "Error",
                            actions: ["OK", "CANCEL"],
                            onClose: function (oAction) {

                            }
                        }
                        );


                    }
                });
            },
            onPressCan: function(){
                this.OnSignaturePress();
            },
                OnSignaturePress: function () {
                var that = this,
                    oView = this.getView();
                if (!this._pAddRecordDialog) {
                    this._pAddRecordDialog = Fragment.load({
                        id: oView.getId(),
                        name: "com.eros.advancepayment.fragment.signaturePad",
                        controller: this,
                    }).then(function (oValueHelpDialog) {
                        oView.addDependent(oValueHelpDialog);
                        return oValueHelpDialog;
                    });
                }

                this._pAddRecordDialog.then(
                    function (oValueHelpDialog) {
                        that.onClear();
                        oValueHelpDialog.open();
                    }.bind(that)
                );
            },
            onSave: function () {
                var that = this,
                    token,
                    dataUrl,
                    oSvg = sap.ui.core.Fragment.byId(this.getView().getId(), "idSignaturePad").getSVGString(),
                    oSvgCash = sap.ui.core.Fragment.byId(this.getView().getId(), "idSignaturePadCash").getSVGString();
                this.oPaySignatureload = [];
                // oName = sap.ui.core.Fragment.byId(this.getView().getId(), "idName").getValue(),
                // oStaff = sap.ui.core.Fragment.byId(this.getView().getId(), "idStaff").getValue(),
                // oComments = sap.ui.core.Fragment.byId(this.getView().getId(), "idComments").getValue();

                if (!oSvg.includes('d=') || !oSvgCash.includes('d=')) {
                    MessageBox.error('Signature is required');
                    return false;
                }
                const svgBlob = new Blob([oSvg], {
                    type: 'image/svg+xml'
                });
                const svgObjectUrl = globalThis.URL.createObjectURL(svgBlob);
                const img = document.createElement('img');

                const onImageLoaded = () => {
                    const canvas = document.createElement('canvas');
                    //canvas.width="350";
                    //canvas.height="100";
                    const context = canvas.getContext('2d');
                    const createdImage = document.createElement('img');

                    context.drawImage(img, 0, 0);
                    createdImage.src = canvas.toDataURL('image/bmp');
                    //binary code
                    var oArray = (createdImage.src).split(";base64,")[1];
                    var raw = window.atob(oArray);
                    var rawLength = raw.length;
                    var array = new Uint8Array(new ArrayBuffer(rawLength));
                    for (var i = 0; i < rawLength; i++) {
                        array[i] = raw.charCodeAt(i);
                    }

                    this.oPaySignatureload.push({
                        "TransactionId": this.getView().byId("tranNumber").getCount(),
                        "Value": oArray,
                        "Mimetype": 'image/bmp',
                        "SignType": "S"
                    })


                };

                img.addEventListener('load', onImageLoaded);
                img.src = svgObjectUrl;



                const svgBlobCash = new Blob([oSvgCash], {
                    type: 'image/svg+xml'
                });
                const svgObjectUrlCash = globalThis.URL.createObjectURL(svgBlobCash);
                const imgCash = document.createElement('img');

                const onImageLoadedCash = () => {
                    const canvasCash = document.createElement('canvas');
                    //canvas.width="350";
                    //canvas.height="100";
                    const contextCash = canvasCash.getContext('2d');
                    const createdImageCash = document.createElement('img');

                    contextCash.drawImage(imgCash, 0, 0);
                    createdImageCash.src = canvasCash.toDataURL('image/bmp');
                    //binary code
                    var oArrayCash = (createdImageCash.src).split(";base64,")[1];
                    var rawCash = window.atob(oArrayCash);
                    var rawLengthCash = rawCash.length;
                    var arrayCash = new Uint8Array(new ArrayBuffer(rawLengthCash));
                    for (var j = 0; j < rawLengthCash; j++) {
                        arrayCash[j] = rawCash.charCodeAt(j);
                    }

                    this.oPaySignatureload.push({
                        "TransactionId": this.getView().byId("tranNumber").getCount(),
                        "Value": oArrayCash,
                        "Mimetype": 'image/bmp',
                        "SignType": "C"
                    })


                };

                imgCash.addEventListener('load', onImageLoadedCash);
                imgCash.src = svgObjectUrlCash;
                that._pAddRecordDialog.then(
                    function (oValueHelpDialog) {
                        that.onClear();
                        oValueHelpDialog.setBusy(true);
                    }.bind(that)
                );
                setTimeout(function(){
                    that.onPressCancel();},1000)


            },
             onClear: function () {
                sap.ui.core.Fragment.byId(this.getView().getId(), "idSignaturePad").clear();
                sap.ui.core.Fragment.byId(this.getView().getId(), "idSignaturePadCash").clear();
                // sap.ui.core.Fragment.byId(this.getView().getId(), "idName").setValue("");
                // sap.ui.core.Fragment.byId(this.getView().getId(), "idStaff").setValue("");
                // sap.ui.core.Fragment.byId(this.getView().getId(), "idComments").setValue("");
            },
               onDialogClose: function () {
                this.onClear();
                this._pAddRecordDialog.then(
                    function (oValueHelpDialog) {
                        oValueHelpDialog.close();
                    }.bind(this)
                );
            }

            
        });
    });
