import { Context } from "@loopback/core";
import config from './config.json';
import axios from 'axios';
import {ActionConfig, OperationStatus} from '../../../../services-interfaces';
import {UserRepository} from '../../../../repositories';
import {SpotifyHelper} from '../../helper';

export default class ActionController {

    static async createAction(userID: string, actionConfig: Object, ctx: Context): Promise<OperationStatus> {
        const configTyped = actionConfig as {id: string};
        const userRepository: UserRepository = await ctx.get('repositories.UserRepository');

        // eslint-disable-next-line @typescript-eslint/no-misused-promises,no-async-promise-executor
        return new Promise<OperationStatus>(async (resolve) => {
            const serviceData: {token: string} = await userRepository.getServiceInformation(userID, 'spotify') as {token: string};

            axios.get(`https://api.spotify.com/v1/playlists/${configTyped.id}/tracks`, {headers: {Authorization: 'Bearer ' + serviceData.token}}).then((res) => {
                resolve({ success: true, options: {id: configTyped.id}, data: {lastDate: new Date().valueOf()}});
            }).catch((e) => {
                console.log(e);
                resolve({ success: false, error: "This playlist does not exist", details: e });
            });
        });
    }

    static async createActionFinished(actionID: string, userID: string, actionConfig: Object, ctx: Context): Promise<OperationStatus> {
        await SpotifyHelper.startNewPlaylistSongPulling(actionID, userID, ctx);
        return {success: true}
    }

    static async updateAction(actionId: string, oldActionConfig: Object, newActionConfig: Object, ctx: Context): Promise<OperationStatus> {
        return {success: true};
    }

    static async deleteAction(actionID: string, actionConfig: Object, ctx: Context): Promise<OperationStatus> {
        return {success: true};
    }

    static async getConfig(): Promise<ActionConfig> {
        return config as ActionConfig;
    }



}