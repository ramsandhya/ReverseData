Static data :-
  Account
    ID (Auto)
    Industry
    Account Name (Business Name) No Repeat
  Contact
    ID (Auto)
    First Name
    Last Name (No Repeat)
  Product
    Industry (Insurance, Finance, Retail, HiTech, Pharmaceutical, Hospitality)
    Product Name
    Price
    Unit of Measurement
  Opportunity Stage
    Stage Value
    Contacted
    Demo Scheduled
    Proposal Presented
    Negotiation Started
    Contract Signed
    Closed-Won
    Closed-Lost

Dynamic Data:-
  SFDCAccount
    Id
    Account Name (Business Name)
    SFDC Account ID
  SFDCContact
    Id
    LocalAccountId
    AccountId (SFDC Account ID)
    First Name
    Last Name
  SFDCOpportunity
    Id
    LocalAccountId
    AccountId (SFDC Account ID)
    SFDC Opportunity ID (null)
    Name (Product Name)
    Amount
    CreatedDate
    LastModifiedDate (same as CreatedDate)
    Stage

    var data = {
      accountName: $scope.accountName,
      firstName: $scope.firstName,
      ...
    }
