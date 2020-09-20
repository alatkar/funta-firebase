/*
We have two types of personas
Individual: A person who can post and have pets as well as business
Organization: Like 'PetsSmart'. They can have Business. They CAN'T have Pets.
*/
module.exports ={
    userType : {
        INDIVIDUAL: 'INDIVIDUAL',
        ORGANIZATION: 'ORGANIZATION'
    },

    profileType : {
        PETPROFILE: 'PETPROFILE',
        BUSINESS: 'BUSINESS'
    },

    businessType : {
        PRODUCT: 'PRODUCT',
        SERVICES: 'SERVICES'
    },

    barkCategory : {
        BUYSELL: 'BUYSELL',
        GENERAL: 'GENERAL',
        LOSTANDFOUND: 'LOSTANDFOUND',        
        QUESTION: 'QUESTION', /* Or Suggestion? Advice?*/
        RECOMMENDATION: 'RECOMMENDATION',        
    }
}