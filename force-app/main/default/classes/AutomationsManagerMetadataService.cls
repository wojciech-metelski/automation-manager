public without sharing class AutomationsManagerMetadataService {
    public static String API_VERSION = '56.0';
    public static String METADATA_SOAP_URL = '/services/Soap/m/' + API_VERSION;
    static final String BASE_URL;

    static{
        BASE_URL = URL.getOrgDomainUrl().toExternalForm();
    }

    private static String apiEnabledSessionId(){
        PageReference sessionPage = Page.SessionId;
        String vfContent = 
            Test.isRunningTest() 
            ? 'Start_Of_Session_IdSessionIdEnd_Of_Session_Id': sessionPage.getContent().toString();
        Integer startIndex = vfContent.indexOf('Start_Of_Session_Id') + 'Start_Of_Session_Id'.length();
        Integer endIndex = vfContent.indexOf('End_Of_Session_Id');
        return vfContent.substring(startIndex, endIndex);
    }

    private static String getDeployOptions(){
        List<String> deploySettings = new List<String>{
            '<DeployOptions>',
                '<allowMissingFiles>true</allowMissingFiles>',
                '<rollbackOnError>true</rollbackOnError>',
                '<ignoreWarnings>false</ignoreWarnings>',
                '<checkOnly>false</checkOnly>',
                '<singlePackage>true</singlePackage>',
                '<purgeOnDelete>false</purgeOnDelete>',
            '</DeployOptions>'
        };

        return String.join(deploySettings, '\n');
    }

    private static String getSoapDeployBody(String sessionId, String zip, String options){
        List<String> xml = new List<String>{
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
            '<soapenv:Header xmlns="http://soap.sforce.com/2006/04/metadata">',
            '<SessionHeader>',
                '<sessionId>{0}</sessionId>',
            '</SessionHeader>',
            '</soapenv:Header>',
            '<soapenv:Body xmlns="http://soap.sforce.com/2006/04/metadata">',
            '<deploy>',
                '<ZipFile>{1}',
                '</ZipFile>',
                '{2}',
            '</deploy>',
            '</soapenv:Body>',
        '</soapenv:Envelope>'
        };

        return String.format(
            String.join(xml, '\n'), 
            new List<String>{sessionId, zip, options}
        );
    }

    private static HttpResponse makeSoapRequest(String body){
        HttpRequest request = new HttpRequest();
        request.setEndpoint(BASE_URL + METADATA_SOAP_URL);
        request.setMethod('POST');
        request.setHeader('content-type', 'text/xml');
        request.setHeader('soapaction', '""');
        request.setBody(body);

        HttpResponse response = (new Http()).send(request);
        if(response.getStatusCode() < 200 || response.getStatusCode() >= 300){
            System.debug(response.getStatus());
            throw new HandledException(response.getStatus());
        }

        return response;
    }

    @AuraEnabled
    public static String checkDeploymentStatus(String deploymentId){
        try {
            final String REQUEST_URL = '/services/data/v' + API_VERSION + 
                '/metadata/deployRequest/' + deploymentId + '?includeDetails=true';
            HttpRequest request = new HttpRequest();
            request.setEndpoint(BASE_URL + REQUEST_URL);
            request.setMethod('GET');
            request.setHeader('Authorization', 'Bearer ' + apiEnabledSessionId());
            request.setHeader('Content-Type', 'application/json');

            HttpResponse response = (new Http()).send(request);
            if(response.getStatusCode() < 200 || response.getStatusCode() >= 300){
                System.debug(response.getStatus());
                throw new HandledException(response.getStatus());
            }
            
            return response.getBody();
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static String deployData(String zip){
        try {
            String body = getSoapDeployBody(apiEnabledSessionId(), zip, getDeployOptions());
            HttpResponse response = makeSoapRequest(body);

            return response.getBody();
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
}