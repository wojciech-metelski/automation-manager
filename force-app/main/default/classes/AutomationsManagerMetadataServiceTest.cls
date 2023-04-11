@IsTest
global class AutomationsManagerMetadataServiceTest {
    
    global class MetadataCalloutMock implements HttpCalloutMock{
        Integer statusCode;

        MetadataCalloutMock(Integer statusCode){
            this.statusCode = statusCode;
        }

        global HTTPResponse respond(HTTPRequest req) {
            HttpResponse res = new HttpResponse();
            res.setHeader('Content-Type', 'text/xml');
            res.setBody('');
            res.setStatusCode(statusCode);
            return res;
        }
    }

    @IsTest
    public static void shouldDeploy(){
        Test.setMock(HttpCalloutMock.class, new MetadataCalloutMock(200));
        Test.startTest();
        AutomationsManagerMetadataService.deployData('');
        Test.stopTest();
    }

    @IsTest
    public static void shouldNotDeploy(){
        Test.setMock(HttpCalloutMock.class, new MetadataCalloutMock(400));
        Test.startTest();
            try{
                AutomationsManagerMetadataService.deployData('');
            }catch(Exception e){}
        Test.stopTest();
    }

    @IsTest
    static void shouldCheckDeploymentStatus(){
        Test.setMock(HttpCalloutMock.class, new MetadataCalloutMock(200));
        Test.startTest();
            AutomationsManagerMetadataService.checkDeploymentStatus('');
        Test.stopTest();
    }

    @IsTest
    static void shouldFailCheckDeploymentStatus(){
        Test.setMock(HttpCalloutMock.class, new MetadataCalloutMock(400));
        Test.startTest();
            try{
                AutomationsManagerMetadataService.checkDeploymentStatus('');
            }catch(Exception e){}
        Test.stopTest();
    }

}