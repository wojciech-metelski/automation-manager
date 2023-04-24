public class AutomationsManagerSnapshotController {
    
    public class Snapshot{
        @AuraEnabled public String id {get; set;}
        @AuraEnabled public DateTime createdDate;
        @AuraEnabled public String name;
        @AuraEnabled public String queryName;
        @AuraEnabled public String queryObjectName;
        @AuraEnabled public String snapshot;
        @AuraEnabled public Boolean isShown {get; set;}
        @AuraEnabled public String description {get; set;}

        public snapshot(){}

        public Snapshot(Automations_snapshot__c snapshot){
            this.id = snapshot.id;
            this.createdDate = snapshot.createdDate;
            this.name = snapshot.name;
            this.snapshot = snapshot.Snapshot__c;
            this.queryName = snapshot.Query_Name__c;
            this.queryObjectName = snapshot.Query_Object_Name__c;
            this.isShown = snapshot.Is_Shown__c;
            this.description = snapshot.Description__c;
        }
    }

    @AuraEnabled
    public static void createSnapshot(
        String jsonSnapshot, String name, 
        String objectName, String description
    ){
        System.debug(jsonSnapshot);
        Automations_Snapshot__c snapshot = new Automations_Snapshot__c(
            Snapshot__c = jsonSnapshot,
            Query_Name__c = name,
            Query_Object_Name__c = objectName,
            Description__c = description
        );

        insert snapshot;
    }

    @AuraEnabled
    public static void updateSnapshots(List<Snapshot> snapshots){
        try {
            List<Automations_Snapshot__c> snapshotsToUpdate = 
                new List<Automations_Snapshot__c>();
                
            for(Snapshot snapshot : snapshots){
                Automations_Snapshot__c updatedSnapshot = new Automations_Snapshot__c();
                updatedSnapshot.Id = snapshot.id;
                if(String.isNotBlank(snapshot.description)){
                    updatedSnapshot.Description__c = snapshot.description;
                }
                if(snapshot.isShown != null){
                    updatedSnapshot.Is_Shown__c = snapshot.isShown;
                }
                snapshotsToUpdate.add(updatedSnapshot);
            }

            update snapshotsToUpdate;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static List<Snapshot> getSnapshots(){
        List<Automations_Snapshot__c> snapshots = [
            SELECT Id, Name, CreatedDate, Snapshot__c, 
                Query_Name__c, Query_Object_Name__c, Is_Shown__c, Description__c
            FROM Automations_Snapshot__c
            WHERE OwnerId = :UserInfo.getUserId()
            ORDER BY CreatedDate DESC
        ];
    
        List<Snapshot> wrappers = new List<Snapshot>();
        for(Automations_Snapshot__c snapshot : snapshots){
            wrappers.add(new Snapshot(snapshot));
        }

        return wrappers;
    }

    @AuraEnabled
    public static void deleteSnapshots(List<String> ids){
        try {
            Database.delete(ids);
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}