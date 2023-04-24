public without sharing class  AutomationsManagerController {

    public class FlowWrapper{
        @AuraEnabled public Boolean isActive;
        @AuraEnabled public String id;
        @AuraEnabled public String flowDefinitionId; 
        @AuraEnabled public String activeVersionId;
        @AuraEnabled public Integer latestVersion;
        @AuraEnabled public String latestVersionId;
        @AuraEnabled public String name;
        @AuraEnabled public String relatedObject;
    }

    public class WorkflowRuleWrapper{
        @AuraEnabled public Boolean isActive;
        @AuraEnabled public Object metadata;
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public String relatedObject;
    }

    public class TriggerWrapper{
        @AuraEnabled public Boolean isActive;
        @AuraEnabled public String body;
        @AuraEnabled public String id;
        @AuraEnabled public String name;
        @AuraEnabled public String relatedObject;
    }

    static final String BASE_URL;
    static final String API_VERSION = '57.0';
    static final String GET = 'GET';
    static final String POST = 'POST';
    static final String PATCH = 'PATCH';
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

    public static HttpResponse makeRequest(String method, String requestUrl, String body){
        HttpRequest request = new HttpRequest();
        request.setEndpoint(BASE_URL + requestUrl);
        request.setMethod(method);
        request.setHeader('Authorization', 'Bearer ' + apiEnabledSessionId());
        request.setHeader('Content-Type', 'application/json');
        if(String.isNotBlank(body)){
            request.setBody(body);
        }

        HttpResponse response = (new Http()).send(request);
        System.debug('RESPONSE: ' + response.getBody());

        if(response.getStatusCode() < 200 || response.getStatusCode() >= 300){
            throw new HandledException(response.getStatus());
        }

        return response;
    }

    public static HttpResponse makeRequest(String method, String requestUrl){
        return makeRequest(method, requestUrl, null);
    }

    public class Request{
        public String method;
        public String url;
        public String referenceId;
        public Map<String, Object> body;
    }

    public class CompositeRequest{
        public List<Request> compositeRequest;
    }

    public class Response{
        @AuraEnabled public Map<String, Object> body;
        @AuraEnabled public Integer httpStatusCode;
        @AuraEnabled public String referenceId;
    }

    public class CompositeResponse{
        public List<Response> compositeResponse;
    }

    public static HttpResponse makeCompositeRequest(List<Request> subrequests){
        final String REQUEST_URL = '/services/data/v' + API_VERSION + '/tooling/composite';
        CompositeRequest compositeRequest = new CompositeRequest();
        compositeRequest.compositeRequest = subrequests;
        System.debug(JSON.serialize(compositeRequest));
        return makeRequest(POST, REQUEST_URL, JSON.serialize(compositeRequest));
    }



    private static List<String> getQueryValues(String values){
        List<String> queryValues = values.split(',');

        for(Integer i=0; i<queryValues.size(); i++){
            queryValues[i] = '%' + queryValues[i].trim() + '%';
        }

        return queryValues;
    }

    private static Boolean containsValueFromList(String testedString, String values){
        List<String> splitValues = values.split(',');
        testedString = testedString.toLowerCase();

        System.debug(splitValues);
        for(String value : splitValues){
            if(testedString.contains(value.trim())){
                return true;
            }
        }

        return false;
    }
        
    @AuraEnabled
    public static List<TriggerWrapper> getTriggers(String name, String objectName){
        final String queryName = '%' + name + '%';
        final String queryObjectName = '%' + objectName + '%';

        try {
            List<ApexTrigger> triggers = [
                SELECT Id, Name, TableEnumOrId, Body, Status
                FROM ApexTrigger
                WHERE Name LIKE :queryName
            ];

            List<TriggerWrapper> wrappers = new List<TriggerWrapper>();
            if(!triggers.isEmpty()){
                for(ApexTrigger trig : triggers){
                    // if(!String.valueOf(trig.TableEnumOrId).toLowerCase().contains(objectName)){
                    //     continue;
                    // }
                    if(!containsValueFromList(trig.TableEnumOrId, objectName)){
                        continue;
                    }
                    TriggerWrapper wrapper = new TriggerWrapper();
                    wrapper.isActive = (trig.Status == 'Active');
                    wrapper.body = trig.Body;
                    wrapper.id = trig.Id;
                    wrapper.name = trig.name;
                    wrapper.relatedObject = trig.TableEnumOrId;
                    wrappers.add(wrapper);
                }
            }

            return wrappers;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static List<FlowWrapper> getFlows(String name, String objectName){
        final String queryName = '%' + name + '%';
        final String queryObjectName = '%' + objectName + '%';

        try {
            List<FlowDefinitionView> flows = [
                SELECT Id, IsActive, DurableId, ActiveVersionId, VersionNumber, 
                    LatestVersionId, Label, TriggerObjectOrEvent.QualifiedApiName
                FROM FlowDefinitionView
                WHERE ProcessType = 'AutoLaunchedFlow'
                    AND TriggerType IN ('RecordAfterSave', 'RecordBeforeSave')
                    AND Label LIKE :queryName
                    AND TriggerObjectOrEvent.QualifiedApiName LIKE :getQueryValues(objectName)
            ];

            List<FlowWrapper> wrappers = new List<FlowWrapper>();
            for(FlowDefinitionView flow : flows){
                FlowWrapper wrapper = new FlowWrapper();
                wrapper.isActive = flow.IsActive;
                wrapper.id = flow.Id;
                wrapper.flowDefinitionId = flow.DurableId;
                wrapper.activeVersionId = flow.ActiveVersionId;
                wrapper.latestVersionId = flow.LatestVersionId;
                wrapper.latestVersion = flow.VersionNumber;
                wrapper.name = flow.Label;
                wrapper.relatedObject = flow.TriggerObjectOrEvent.QualifiedApiName;
                wrappers.add(wrapper);
            }

            return wrappers;
        } catch (Exception e) {
            System.debug(e.getStackTraceString());
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static List<FlowWrapper> getProcessBuilders(String name, String objectName){
        final String queryName = '%' + name + '%';
        final String queryObjectName = '%' + objectName + '%';

        try {
            List<FlowDefinitionView> flows = [
                SELECT Id, DurableId, IsActive, ActiveVersionId, 
                    LatestVersionId, VersionNumber, Label, TriggerObjectOrEvent.QualifiedApiName
                FROM FlowDefinitionView
                WHERE ProcessType = 'Workflow'
                    AND Label LIKE :queryName
                    // AND TriggerObjectOrEventLabel LIKE :queryObjectName
            ];

            List<FlowWrapper> wrappers = new List<FlowWrapper>();
            for(FlowDefinitionView flow : flows){
                FlowWrapper wrapper = new FlowWrapper();
                wrapper.isActive = flow.IsActive;
                wrapper.id = flow.Id;
                wrapper.flowDefinitionId = flow.DurableId;
                wrapper.activeVersionId = flow.ActiveVersionId;
                wrapper.name = flow.Label;
                wrapper.latestVersion = flow.VersionNumber;
                wrapper.relatedObject = 
                    String.isBlank(flow.TriggerObjectOrEvent.QualifiedApiName) ? '' : flow.TriggerObjectOrEvent.QualifiedApiName;
                wrappers.add(wrapper);
            }

            return wrappers;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    class Metadata{
        Boolean active;
    }

    public class WorkflowResponseItem{
        public String Id;
        public String TableEnumOrId;
    }

    public class WorkflowResponse{
        public List<WorkflowResponseItem> records;
    }

    @AuraEnabled
    public static String getWorkflowBatch(List<String> workflowIds){
        if(workflowIds.size() > 25){
            throw new HandledException('Can\'t handle more than 25 subrequests at once');
        }

        final String SUBREQUEST_URL = '/services/data/v' + API_VERSION + '/tooling/sobjects/WorkflowRule/';
        List<Request> subrequests = new List<Request>();
        Integer num=0;

        for(String id : workflowIds){
            Request request = new Request();
            request.method = GET;
            request.referenceId = 'request' + num;
            request.url = SUBREQUEST_URL + id;
            subrequests.add(request);
            num++;
        }

        HttpResponse response = makeCompositeRequest(subrequests);

        return response.getBody();
    }

    @AuraEnabled
    public static List<String> getWorkflowIds(String name, String objectName){
        name = '%' + name + '%';
        final String QUERY = 'Select Id,Name,TableEnumOrId From WorkflowRule Where Name Like \'' + name +'\'';
        final String REQUEST_URL = '/services/data/v' + API_VERSION + '/tooling/query?q=' + EncodingUtil.urlEncode(QUERY, 'UTF-8');

        HttpResponse response = makeRequest(GET, REQUEST_URL);
        WorkflowResponse workflows = 
            (WorkflowResponse)JSON.deserialize(response.getBody(), WorkflowResponse.class);

        List<String> ids = new List<String>();
        for(WorkflowResponseItem item : workflows.records){
            if(containsValueFromList(item.TableEnumOrId, objectName)){
                ids.add(item.id);
            }
            // if(item.TableEnumOrId.toLowerCase().contains(objectName)){
            //     ids.add(item.Id);
            // }
        }

        return ids;
    }

    public class ValidationRuleResponseItem{
        public String Id;
        public String EntityDefinitionId;
    }

    public class ValidationRuleResponse{
        public List<ValidationRuleResponseItem> records;
    }

    @AuraEnabled
    public static String getValidationRuleBatch(List<String> validationRuleIds){
        final String SUBREQUEST_URL = '/services/data/v' + API_VERSION + '/tooling/sobjects/ValidationRule/';
        List<Request> subrequests = new List<Request>();
        Integer num=0;
        List<String> fields = new List<String>{'Id','ValidationName','EntityDefinition.Fullname','Metadata'};
        for(String id : validationRuleIds){
            Request request = new Request();
            request.method = GET;
            request.referenceId = 'request' + num;
            request.url = SUBREQUEST_URL + id + '?fields=' + String.join(fields, ',');
            subrequests.add(request);
            num++;
        }

        HttpResponse response = makeCompositeRequest(subrequests);

        return response.getBody();
    }

    @AuraEnabled
    public static List<String> getValidationRuleIds(String name, String objectName){
        name = '%' + name + '%';
        final String QUERY = 'Select Id,EntityDefinitionId From ValidationRule Where ValidationName Like \'' + name +'\'';
        final String REQUEST_URL = 
            '/services/data/v' + API_VERSION + '/tooling/query?q=' + EncodingUtil.urlEncode(QUERY, 'UTF-8');

        HttpResponse response = makeRequest(GET, REQUEST_URL);
        ValidationRuleResponse validationRules = 
            (ValidationRuleResponse)JSON.deserialize(response.getBody(), ValidationRuleResponse.class);

        List<String> ids = new List<String>();
        for(ValidationRuleResponseItem validationRule: validationRules.records) {
            if(containsValueFromList(validationRule.EntityDefinitionId, objectName)){
                ids.add(validationRule.id);
            }
            // if(validationRule.EntityDefinitionId.toLowerCase().contains(objectName)){
            //     ids.add(validationRule.Id);
            // }
        }

        return ids;
    }

    public class FlowToggle{
        @AuraEnabled public String flowViewId {get; set;}
        @AuraEnabled public String flowDefinitionId {get; set;}
        @AuraEnabled public Integer activeVersion {get; set;}
    }

    @AuraEnabled
    public static String toggleFlows(List<FlowToggle> flows){
        if(flows.size() > 25){
            throw new HandledException('Can\'t handle more than 25 update requests at once');
        }

        try{
            final String SUBREQUEST_URL = '/services/data/v' + API_VERSION + '/tooling/sobjects/FlowDefinition/';
            List<Request> subrequests = new List<Request>();
            Integer num = 0;

            for(FlowToggle flow : flows){
                final Map<String, Object> METADATA = new Map<String, Object>{
                    'Metadata' => new Map<String, Integer>{'activeVersionNumber' => flow.activeVersion}
                };
                Request request = new Request();
                request.method = PATCH;
                request.referenceId = flow.flowViewId;
                //request.referenceId = 'subrequest' + (num++);
                request.url = SUBREQUEST_URL + flow.flowDefinitionId;
                request.body = METADATA;
                subrequests.add(request);
            }

            HttpResponse response = makeCompositeRequest(subrequests);
            return response.getBody();
            //return (CompositeResponse)JSON.deserialize(response.getBody(), CompositeResponse.class);
        }catch (Exception e) {
            System.debug(e.getStackTraceString());
            throw new AuraHandledException(e.getMessage());
        }
    }

    public class WorkflowRuleToggle{
        @AuraEnabled public String workflowId {get; set;}
        @AuraEnabled public Object metadata {get; set;}
    }

    @AuraEnabled
    public static String toggleWorkflows(List<WorkflowRuleToggle> workflows){
        System.debug(workflows);
        if(workflows.size() > 25){
            throw new HandledException('Can\'t handle more than 25 update requests at once');
        }

        try{
            final String SUBREQUEST_URL = '/services/data/v' + API_VERSION + '/tooling/sobjects/WorkflowRule/';
            List<Request> subrequests = new List<Request>();
            Integer num = 0;

            for(WorkflowRuleToggle flow : workflows){
                final Map<String, Object> body = new Map<String, Object>{
                    'Metadata' => flow.metadata
                };
                Request request = new Request();
                request.method = PATCH;
                request.referenceId = flow.workflowId;
                request.url = SUBREQUEST_URL + flow.workflowId;
                request.body = body;
                subrequests.add(request);
                num++;
            }

            HttpResponse response = makeCompositeRequest(subrequests);

            return response.getBody();
        }catch (Exception e) {
            System.debug(e.getStackTraceString());
            throw new AuraHandledException(e.getMessage());
        }
    }

    public class ValidationRuleToggle{
        @AuraEnabled public String validationRuleId {get; set;}
        @AuraEnabled public Object metadata {get; set;}
    }

    @AuraEnabled
    public static String toggleValidationRules(List<ValidationRuleToggle> validationRules){
        if(validationRules.size() > 25){
            throw new HandledException('Can\'t handle more than 25 update requests at once');
        }

        try{
            final String SUBREQUEST_URL = '/services/data/v' + API_VERSION + '/tooling/sobjects/ValidationRule/';
            List<Request> subrequests = new List<Request>();
            Integer num = 0;

            for(ValidationRuleToggle validationRule : validationRules){
                final Map<String, Object> body = new Map<String, Object>{
                    'Metadata' => validationRule.metadata
                };
                Request request = new Request();
                request.method = PATCH;
                request.referenceId = validationRule.validationRuleId;
                request.url = SUBREQUEST_URL + validationRule.validationRuleId;
                request.body = body;
                subrequests.add(request);
                num++;
            }

            HttpResponse response = makeCompositeRequest(subrequests);

            return response.getBody();
        }catch (Exception e) {
            System.debug(e.getStackTraceString());
            throw new AuraHandledException(e.getMessage());
        }
    }
}