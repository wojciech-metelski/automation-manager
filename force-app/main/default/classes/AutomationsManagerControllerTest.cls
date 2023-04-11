@IsTest
global class AutomationsManagerControllerTest {
    final static Integer COUNT = 10;
    final static Integer ERROR_COUNT = 26;
    final static String TEST_VALUE = 'TEST';

    public static String getWorkflowIds(){
        AutomationsManagerController.WorkflowResponse response = 
            new AutomationsManagerController.WorkflowResponse();
            response.records = new List<AutomationsManagerController.WorkflowResponseItem>();
        
            for(Integer i=0; i<COUNT; i++){
                AutomationsManagerController.WorkflowResponseItem item =
                    new AutomationsManagerController.WorkflowResponseItem();
                item.Id =  TEST_VALUE + i;
                item.TableEnumOrId = TEST_VALUE + i;

                response.records.add(item);
            }

        return JSON.serialize(response);
    }

    public static String getValidationRuleIds(){
        AutomationsManagerController.ValidationRuleResponse response = 
            new AutomationsManagerController.ValidationRuleResponse();
            response.records = new List<AutomationsManagerController.ValidationRuleResponseItem>();
        
            for(Integer i=0; i<COUNT; i++){
                AutomationsManagerController.ValidationRuleResponseItem item =
                    new AutomationsManagerController.ValidationRuleResponseItem();
                item.Id =  TEST_VALUE + i;
                item.EntityDefinitionId = TEST_VALUE + i;

                response.records.add(item);
            }

        return JSON.serialize(response);
    }

    static Boolean isWorkflowQuery(String url){
        return (url.contains('/tooling/query') && url.contains('WorkflowRule'));
    }

    static Boolean isValidationRuleQuery(String url){
        return (url.contains('/tooling/query') && url.contains('ValidationRule'));
    }

    global class ToolingCalloutMock implements HttpCalloutMock{
        Integer statusCode;

        ToolingCalloutMock(Integer statusCode){
            this.statusCode = statusCode;
        }

        global HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'application/json');
            res.setStatusCode(statusCode);

            final String url = req.getEndpoint();
            if(isWorkflowQuery(url)){
                res.setBody(getWorkflowIds());
            }else if(isValidationRuleQuery(url)){
                res.setBody(getValidationRuleIds());
            }else{
                res.setBody('');
            }

            return res;
        }
    }

    @IsTest
    public static void shouldGetFlows(){
        Test.startTest();
            AutomationsManagerController.getFlows('', '');
        Test.stopTest();
    }

    @IsTest
    public static void shouldGetTriggers(){
        Test.startTest();
            AutomationsManagerController.getTriggers('', '');
        Test.stopTest();
    }

    @IsTest
    public static void shouldGetProcessBuilders(){
        Test.startTest();
            AutomationsManagerController.getProcessBuilders('', '');
        Test.stopTest();
    }

    public static List<String> getListOfIds(){
        List<String> ids = new List<String>();
        for(Integer i=0; i<COUNT; i++){
            ids.add(TEST_VALUE + i);
        }
        return ids;
    }

    @IsTest
    public static void shouldGetWorkflowIds(){
        Test.setMock(HttpCalloutMock.class, new ToolingCalloutMock(200));
        Test.startTest();
            AutomationsManagerController.getWorkflowIds('', '');
        Test.stopTest();
    }

    @IsTest
    public static void shouldGetWorkflowBatch(){
        Test.setMock(HttpCalloutMock.class, new ToolingCalloutMock(200));
        Test.startTest();
            AutomationsManagerController.getWorkflowBatch(getListOfIds());
        Test.stopTest();
    }

    @IsTest
    public static void shouldGetValidationRuleIds(){
        Test.setMock(HttpCalloutMock.class, new ToolingCalloutMock(200));
        Test.startTest();
            AutomationsManagerController.getValidationRuleIds('', '');
        Test.stopTest();
    }

    @IsTest
    public static void shouldGetValidationRuleBatch(){
        Test.setMock(HttpCalloutMock.class, new ToolingCalloutMock(200));
        Test.startTest();
            AutomationsManagerController.getValidationRuleBatch(getListOfIds());
        Test.stopTest();
    }

    public static List<AutomationsManagerController.FlowToggle> getFlowToggles(Integer count){
        List<AutomationsManagerController.FlowToggle> toggles = 
            new List<AutomationsManagerController.FlowToggle>();

        for(Integer i=0; i<count; i++){
            AutomationsManagerController.FlowToggle toggle = 
                new AutomationsManagerController.FlowToggle();
            toggle.flowDefinitionId = TEST_VALUE + i;
            toggle.activeVersion = 0;
            toggles.add(toggle);
        }

        return toggles;
    }

    @IsTest
    public static void shouldUpdateFlows(){
        Test.setMock(HttpCalloutMock.class, new ToolingCalloutMock(200));
        Test.startTest();
            AutomationsManagerController.toggleFlows(getFlowToggles(COUNT));
            try{
                AutomationsManagerController.toggleFlows(getFlowToggles(ERROR_COUNT));
            }catch(Exception e){
                System.debug(e.getMessage());
            }   
        Test.stopTest();
    }

    public static List<AutomationsManagerController.WorkflowRuleToggle> getWorkflowToggles(Integer count){
        List<AutomationsManagerController.WorkflowRuleToggle> toggles = 
            new List<AutomationsManagerController.WorkflowRuleToggle>();

        for(Integer i=0; i<count; i++){
            AutomationsManagerController.WorkflowRuleToggle toggle = 
                new AutomationsManagerController.WorkflowRuleToggle();
            toggle.workflowId = TEST_VALUE + i;
            toggle.metadata = TEST_VALUE + i;
            toggles.add(toggle);
        }

        return toggles;
    }

    @IsTest
    public static void shouldUpdateWorkflows(){
        Test.setMock(HttpCalloutMock.class, new ToolingCalloutMock(200));
        Test.startTest();
            AutomationsManagerController.toggleWorkflows(getWorkflowToggles(COUNT));
            try{
                AutomationsManagerController.toggleWorkflows(getWorkflowToggles(ERROR_COUNT));
            }catch(Exception e){
                System.debug(e.getMessage());
            }

        Test.stopTest();
    }

    public static List<AutomationsManagerController.ValidationRuleToggle> getValidationRuleToggles(Integer count){
        List<AutomationsManagerController.ValidationRuleToggle> toggles = 
            new List<AutomationsManagerController.ValidationRuleToggle>();

        for(Integer i=0; i<count; i++){
            AutomationsManagerController.ValidationRuleToggle toggle = 
                new AutomationsManagerController.ValidationRuleToggle();
            toggle.validationRuleId = TEST_VALUE + i;
            toggle.metadata = TEST_VALUE + i;
            toggles.add(toggle);
        }

        return toggles;
    }

    @IsTest
    public static void shouldUpdateValidationRules(){
        Test.setMock(HttpCalloutMock.class, new ToolingCalloutMock(200));
        Test.startTest();
            AutomationsManagerController.toggleValidationRules(getValidationRuleToggles(COUNT));
            try{
                AutomationsManagerController.toggleValidationRules(getValidationRuleToggles(ERROR_COUNT));
            }catch(Exception e){
                System.debug(e.getMessage());
            }
        Test.stopTest();
    }
}