public class AutomationsManagerSnapshotController {
    
    class Snapshot{
        @AuraEnabled public String id;
        @AuraEnabled public DateTime createdDate;
        @AuraEnabled public String name;
        @AuraEnabled public String queryName;
        @AuraEnabled public String queryObjectName;
        @AuraEnabled public String snapshot;

        Snapshot(Automations_snapshot__c snapshot){
            this.id = snapshot.id;
            this.createdDate = snapshot.createdDate;
            this.name = snapshot.name;
            this.snapshot = snapshot.Snapshot__c;
            this.queryName = snapshot.Query_Name__c;
            this.queryObjectName = snapshot.Query_Object_Name__c;
        }
    }

    @AuraEnabled
    public static List<Snapshot> createSnapshot(String jsonSnapshot, String name, String objectName){
        System.debug(jsonSnapshot);
        Automations_Snapshot__c snapshot = new Automations_Snapshot__c(
            Snapshot__c = jsonSnapshot,
            Query_Name__c = name,
            Query_Object_Name__c = objectName
        );
        insert snapshot;

        List<Automations_Snapshot__c> snapshots = [
            SELECT Id, Name, CreatedDate, Snapshot__c
            FROM Automations_Snapshot__c
            ORDER BY CreatedDate ASC
        ];

        if(snapshots.size() > 10){
            Database.delete(snapshots[0].Id);
        }

        return getSnapshots();
    }

    @AuraEnabled
    public static List<Snapshot> getSnapshots(){
        List<Automations_Snapshot__c> snapshots = [
            SELECT Id, Name, CreatedDate, Snapshot__c, Query_Name__c, Query_Object_Name__c
            FROM Automations_Snapshot__c
            ORDER BY CreatedDate DESC
        ];
    
        
        List<Snapshot> wrappers = new List<Snapshot>();
        for(Automations_Snapshot__c snapshot : snapshots){
            wrappers.add(new Snapshot(snapshot));
        }

        return wrappers;
    }

}