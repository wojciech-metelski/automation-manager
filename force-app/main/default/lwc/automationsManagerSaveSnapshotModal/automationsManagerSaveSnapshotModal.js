import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import createSnapshot from '@salesforce/apex/AutomationsManagerSnapshotController.createSnapshot';
import getSnapshots from '@salesforce/apex/AutomationsManagerSnapshotController.getSnapshots';

export default class AutomationsManagerSaveSnapshotModal extends LightningElement {
    snapshot;
    name;
    objectName;

    isLoading = false;
    isShown = false;
    description = '';

    showToast(title, message, variant='info') {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }
    
    get saveDisabled(){
        return this.description?.length == 0;
    }

    @api
    async showModal(name, objectName, snapshot){
        this.isShown = true;
        this.name = name;
        this.objectName = objectName;
        this.snapshot = snapshot;
    }

    handleNameChange(e){
        this.description = e.detail.value;
    }

    async saveSnapshot(){
        this.isLoading = true;
        console.log('OBJECT NAME: ' + this.objectName);
        try {
            await createSnapshot({
                jsonSnapshot: this.snapshot,
                name: this.name,
                objectName: this.objectName,
                description: this.description
            });
            const snapshots = await getSnapshots();
            this.dispatchEvent(new CustomEvent('refreshsnapshots', {detail: snapshots}));
            this.showToast('Success', 'Snapshot Saved', 'success');
            this.isShown = false;
        } catch (e) { 
            console.error(e.message || e.body.message || JSON.stringify(e));
        } finally {
            this.isLoading = false;
        }
    }

    closeModal(){
        this.isShown = false;
    }
}