import * as dotenv  from 'dotenv'
import * as path from 'path'

//ENVIRONMENT Configuration
if(process.env.ENVIRONMENT == 'local'){
    dotenv.config({ path: path.resolve('./config/env/'+process.env.ENVIRONMENT+'.env')});
}

import App from './app'
 
//Create application with version v1
const app = new App('v1');

//Lambda handler
export const handler = app.lambdaHandler;