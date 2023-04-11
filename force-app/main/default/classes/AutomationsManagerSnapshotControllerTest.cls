@IsTest
public class AutomationsManagerSnapshotControllerTest {
    public static Integer COUNT = 10;

    public static String TEST_VALUE = 'TEST';
    
    @TestSetup
    public static void makeData(){
        List<Automations_Snapshot__c> snapshots = new List<Automations_Snapshot__c>();
        for(Integer i=0; i<COUNT; i++){
            Automations_Snapshot__c snapshot = new Automations_Snapshot__c(
                Snapshot__c = TEST_VALUE + i,
                Query_Name__c = TEST_VALUE + i,
                Query_Object_Name__c = TEST_VALUE + i
            );
            snapshots.add(snapshot);
        }

        insert snapshots;
    }
    
    @IsTest
    public static void shouldGetSnapshots(){
        Test.startTest();
            AutomationsManagerSnapshotController.getSnapshots();
        Test.stopTest();
    }

    @IsTest
    public static void shouldCreateSnapshot(){
        Test.startTest();
            AutomationsManagerSnapshotController.createSnapshot(TEST_VALUE, TEST_VALUE, TEST_VALUE);
        Test.stopTest();
    }
}