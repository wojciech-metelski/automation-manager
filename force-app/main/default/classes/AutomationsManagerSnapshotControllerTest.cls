@IsTest
public class AutomationsManagerSnapshotControllerTest {
    public static Integer COUNT = 10;

    public static String TEST_VALUE = 'TEST';
    public static String UPDATED_VALUE = 'UPDATED';
    
    @TestSetup
    public static void makeData(){
        List<Automations_Snapshot__c> snapshots = new List<Automations_Snapshot__c>();
        for(Integer i=0; i<COUNT; i++){
            Automations_Snapshot__c snapshot = new Automations_Snapshot__c(
                Description__c = TEST_VALUE + 1,
                Snapshot__c = TEST_VALUE + i,
                Query_Name__c = TEST_VALUE + i,
                Query_Object_Name__c = TEST_VALUE + i
            );
            snapshots.add(snapshot);
        }

        insert snapshots;
    }

    public static List<AutomationsManagerSnapshotController.Snapshot> getWrappedSnapshots(){
        new AutomationsManagerSnapshotController.Snapshot();

        List<Automations_Snapshot__c> snapshots = [
            SELECT Id, Name, CreatedDate, Description__c, Snapshot__c, 
                Query_Name__c, Query_Object_Name__c, Is_Shown__c
            FROM Automations_Snapshot__c
        ];

        List<AutomationsManagerSnapshotController.Snapshot> wrappers = 
            new List<AutomationsManagerSnapshotController.Snapshot>();
        
        for(Automations_Snapshot__c snapshot : snapshots){
            AutomationsManagerSnapshotController.Snapshot wrapper =
                new AutomationsManagerSnapshotController.Snapshot(snapshot);
            
            wrappers.add(wrapper);
        }

        return wrappers;
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
            AutomationsManagerSnapshotController.createSnapshot(TEST_VALUE, TEST_VALUE, TEST_VALUE, TEST_VALUE);
        Test.stopTest();
    }

    @IsTest
    public static void shouldUpdateSnapshots(){
        Test.startTest();
            AutomationsManagerSnapshotController.updateSnapshots(getWrappedSnapshots());
        Test.stopTest();
    }

    @IsTest
    public static void shouldNotUpdateSnapshots(){
        List<AutomationsManagerSnapshotController.Snapshot> snapshots = getWrappedSnapshots();
        for(AutomationsManagerSnapshotController.Snapshot snap : snapshots){
            snap.id = TEST_VALUE;
        }
        Test.startTest();
            try{
                AutomationsManagerSnapshotController.updateSnapshots(snapshots);
            }catch(Exception e){
                System.debug(e.getMessage());
            }
            
        Test.stopTest();
    }

    @IsTest
    public static void shouldDeleteSnapshot(){
        Test.startTest();
            Automations_snapshot__c snapshot = [
                SELECT Id FROM Automations_snapshot__c LIMIT 1
            ];
            AutomationsManagerSnapshotController.deleteSnapshots(new List<String>{snapshot.Id});
        Test.stopTest();
    }

    @IsTest
    public static void shouldNotDeleteSnapshot(){
        Test.startTest();
            Automations_snapshot__c snapshot = [
                SELECT Id FROM Automations_snapshot__c LIMIT 1
            ];
            try{
                AutomationsManagerSnapshotController.deleteSnapshots(new List<String>{TEST_VALUE});
            }catch(Exception e){
                System.debug(e.getMessage());
            }
        Test.stopTest();
    }
}