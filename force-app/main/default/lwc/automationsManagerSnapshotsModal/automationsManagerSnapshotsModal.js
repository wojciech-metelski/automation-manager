import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getSnapshots from '@salesforce/apex/AutomationsManagerSnapshotController.getSnapshots';
import createSnapshot from '@salesforce/apex/AutomationsManagerSnapshotController.createSnapshot';
import updateSnapshots from '@salesforce/apex/AutomationsManagerSnapshotController.updateSnapshots';
import deleteSnapshots from '@salesforce/apex/AutomationsManagerSnapshotController.deleteSnapshots';


export default class AutomationsManagerSnapshotsModal extends LightningElement {
    isShown = false;
    isLoading = false;
    isDeleteTab = false;
    updateDraftValues = [];

    draftValuesPresent = false;
    deleteRowsCount = 0;
    updateRowsCount = 0;
    exportRowsCount = 0;
    snapshots = [];
    exportUrl;

    get isExportDisabled(){
        return !this.exportUrl;
    }

    showToast(title, message, variant='info') {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }

    get isImportDisabled(){
        return this.isLoading || this.exportRowsCount == 0;
    }

    get isSaveDisabled(){
        return this.isLoading || !this.draftValuesPresent;
    }

    get isDeleteDisabled(){
        return this.isLoading || this.deleteRowsCount == 0;
    }

    get snapshotTable(){
        return this.snapshots.map((item) => {
            const formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'medium'});
            const date = new Date(item.createdDate).getTime();
            item.formttedDate = formatter.format(date);

            return item;
        })
    }

    @api
    async showModal(){
        this.isShown = true;
        
        this.isLoading = true;
        try {
            this.snapshots = await getSnapshots();
        } catch (e) { 
            console.error(e.message || e.body.message || JSON.stringify(e)); 
        } finally {
            this.isLoading = false;
        }
    }

    async saveSnapshots(e){
        const snapshots = [];
        const draftValues = this.template.querySelector('[data-update-table]').draftValues;
        for(const draft of draftValues){
            snapshots.push({
                id: draft.id,
                isShown: draft.isShown,
                description: draft.description
            });
        }
        
        this.isLoading = true;
        try {
            await updateSnapshots({snapshots});
            this.snapshots = await getSnapshots();
            this.showToast('Success', 'Snapshots Updated', 'success');
        } catch (e) { 
            console.error(e.message || e.body.message || JSON.stringify(e)); 
        } finally{
            this.draftValuesPresent = false;
            this.isLoading = false;
        }
    }

    clearUpdateTable(){
        this.template.querySelector('[data-update-table]').draftValues = [];
        this.draftValuesPresent = false;
    }

    async handleDeleteSnapshots(){
        const selectedRows = this.template.querySelector('[data-delete-table]').getSelectedRows();
        console.log(selectedRows);
        const ids = [];

        for(const row of selectedRows){
            ids.push(row.id);
        }
        
        this.isLoading = true;
        try {
            await deleteSnapshots({ids});
            this.snapshots = this.snapshots.filter(snap => !ids.includes(snap.id));
            this.showToast('Success', 'Snapshots Deleted', 'success');
        } catch (e) { 
            console.error(e.message || e.body.message || JSON.stringify(e)); 
        } finally {
            this.isLoading = false;
        }
    }

    syncDraftValues(){
        //const self = this;
        this.draftValuesPresent = true;
        // console.log(this.template.querySelector('[data-update-table]').draftValues);
        // this.updateDraftValues = this.template.querySelector('[data-update-table]').draftValues;
        // setTimeout(() => {
        //     draftValues = self.template.querySelector('[data-update-table]').draftValues;
        //     console.log(JSON.stringify(draftValues));
        //     this.updateDraftValues = draftValues;
        // }, 2000);
    }
    
    syncDeleteRowsCount(e){
        this.deleteRowsCount = this.template.querySelector('[data-delete-table]').getSelectedRows().length;
    }

    syncRowsToExportCount(e){
        const selectedRows = this.template.querySelector('[data-update-table]').getSelectedRows();
        this.exportRowsCount = selectedRows.length;
        const snapshot = this.snapshots.find(item => selectedRows[0].id == item.id);

        this.exportUrl = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot));
    }

    exportJSON(){
        this.template.querySelector('[data-export]').click();
    }

    uploadSnapshot(e){
        console.log('UPLOADING');

        const reader = new FileReader();
        reader.onload = async () => {
            console.log(reader.result);
            const snapshot = JSON.parse(reader.result);

            this.isLoading = true;
            try {
                await createSnapshot({
                    jsonSnapshot: snapshot.snapshot,
                    name: snapshot.queryName,
                    objectName: snapshot.queryObjectName,
                    description: snapshot.description
                });
                this.snapshots = await getSnapshots();
            } catch (e) { 
                console.error(e.message || e.body.message || JSON.stringify(e)); 
            } finally{
                this.isLoading = false;
            }
        }
            
        reader.readAsText(e.detail.files[0]); 
    }

    closeModal(){
        this.exportUrl = null;
        this.template.querySelector('[data-update-table]').draftValues = [];
        this.isShown = false;
        this.dispatchEvent(new CustomEvent('refreshsnapshots', {detail: this.snapshots}));
    }

    handleTabSelection(e){
        const activeTab = e.target.value;
        this.isDeleteTab = (activeTab == 'delete');
    }

    actions = [
        { label: 'Delete', name: 'delete' }
    ];

    get updateColumns() {
        return [
            { label: 'Created Date', fieldName: 'formttedDate', type: 'text'},
            { label: 'Description', fieldName: 'description', type: 'text', editable: true},
            { label: 'Is Shown', fieldName: 'isShown', type: 'boolean', editable: true},
            // { type: 'button', typeAttributes: { label: '✕', variant: 'destructive' } }
        ];
    }

    get deleteColumns() {
        return [
            { label: 'Created Date', fieldName: 'formttedDate', type: 'text'},
            { label: 'Description', fieldName: 'description', type: 'text'}
        ];
    }

    // handleRowAction(event) {
    //     const action = event.detail.action;
    //     const row = event.detail.row;
    //     console.log(row);
    //     switch (action.name) {
    //         case 'delete':
    //             // const rows = this.data;
    //             // const rowIndex = rows.indexOf(row);
    //             // rows.splice(rowIndex, 1);
    //             // this.data = rows;
    //             break;
    //     }
    // }
}