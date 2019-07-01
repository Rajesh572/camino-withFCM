import { Injectable, Inject } from '@angular/core';
import { FCM } from '@ionic-native/fcm';
import { Platform, AlertController, ToastController } from 'ionic-angular';
import * as apiData from './apiData'
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Device } from '@ionic-native/device';


/*
  Generated class for the FcmProvider provider.

  See https://angular.io/guide/dependency-injection for more info on providers
  and Angular DI.
*/
@Injectable()
export class FcmProvider {
  constructor(
    private fcm: FCM,
    private platform: Platform,
    private alertController: AlertController,
    private device:Device,
    private http: HttpClient,
    private toastCtrl: ToastController) { }
    private _token: any;
    private uid;
    public sessionInfo:any;
    private x_auth_id: any;
    private extractedDeviceId;
    private extractedToken;
    userSession:boolean = false;;
 

  async getToken() {
    let token;

    if (this.platform.is('android')) {

      token = await this.fcm.getToken();
    }

    return token;
  }

  onNotifications() {
    return this.fcm.onNotification();
  }

  setSessionInfo(session) {
    this.sessionInfo = session;
    console.log('got sessioninfo',this.sessionInfo);
  }

  setUserAuthToken() {
    this.uid = this.sessionInfo.userToken;
    this.x_auth_id = this.sessionInfo.access_token;
  }

  getUserAuthToken() {
    return (this.sessionInfo.length > 0 || this.sessionInfo) ? this.sessionInfo.access_token : null;
  }
  getUserId() {
    return (this.sessionInfo.length > 0 || this.sessionInfo) ? this.sessionInfo.userToken : null;
  }

  readUserDetails() {
    let url = apiData.readUserDetailURL + `${this.uid}`;
    let headers = new HttpHeaders({
      'Authorization': apiData.bearerToken,
      'x-authenticated-user-token': this.x_auth_id
    });
    return this.http.get(url, { headers });
  }

  async updateUserDetailsforToken() {  
    let url = apiData.updateUserURL;
    let headerObj = {
      'Authorization': apiData.bearerToken,
      'x-authenticated-user-token': this.x_auth_id,
      'Content-Type': 'application/json'
    }
    let token = await this.fcm.getToken(); 
    let deviceId = this.device.uuid;
    let entryData = deviceId + 'device-token' + token
    console.log('token from updateuser',token);
    console.log('deviceid from updateuser',deviceId);

    let body = {
      'request': {
        'userId': this.uid,
        'registryId': entryData
      }
    }
    console.log('request body', body);

    let apiheaders = new HttpHeaders(headerObj);

    return this.http.patch(url, body, { headers: apiheaders });
    
  }

  async registerDevice() {

    let token = await this.getToken();
    let deviceId = this.device.uuid;

    console.log('token from checktoken :', token);
    console.log('deviceId from checktoken :',deviceId);

    let data: any = await this.readUserDetails().toPromise();
    let registryId: string = data.result.response.registryId;
    console.log('registryId :',registryId);
    console.log('data of user',data);

    if(!registryId) {
      console.log('token is empty');

      let alert = this.alertController.create({
        title: 'Do you want to register your device',
        buttons: [{
          text: 'Yes',
          handler: () => {
            console.log('yes clicked')
            this.updateUserDetailsforToken().then((data) => {
              data.subscribe((data) => {
                console.log(data);
              })
            });
          }
        },
        {
          text: 'No',
          handler: () => console.log('no clicked')
        }]
      });
      alert.present();
    }

    if(registryId) {
      let splitted = registryId.split('device-token');
      this.extractedDeviceId = splitted[0];
      this.extractedToken = splitted[1];

      if(this.extractedDeviceId === deviceId) {
        console.log('same device');
        let toast = this.toastCtrl.create({
          message: "Device Already Registered",
          duration:2000
        });
        toast.present();
      }
      else {
        let alert = this.alertController.create({
          title: 'New Device Detected',
          subTitle:'Do you want to register this new device',
          buttons: [{
            text: 'YES',
            handler: () => {
              console.log('yes clicked')
              this.updateUserDetailsforToken().then((data) => {
                data.subscribe((data) => {
                  console.log(data);
                })
              });
            }
          },
          {
            text: 'NO',
            handler: () => console.log('no clicked')
          }]
        });
        alert.present();
      }

    }

  }

  async checkToken() {
    let token = await this.getToken();
    let data: any = await this.readUserDetails().toPromise();
    let registryId :string = data.result.response.registryId;
    let deviceId = this.device.uuid;
    
    let splitted = registryId.split('device-token');
    this.extractedDeviceId = splitted[0];
    this.extractedToken = splitted[1];

    if(this.extractedDeviceId === deviceId) {
      console.log('same device from checktoken');

      if(this.extractedToken === token) {
        console.log('same token from checktoken');
      }
      else {
        this.updateUserDetailsforToken().then(data => {
          data.subscribe((data)=>{
            console.log('data from checktoken',data);
          })
        });
    }
  }
    else {
      console.log('do nothing from checktoken');
    }

  }

}

