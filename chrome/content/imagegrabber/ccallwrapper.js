/*
 *	CCallWrapper.js
 *	$Revision: 1.3 $ $Date: 2003/07/07 18:32:43 $
 */

/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Netscape code.
 *
 * The Initial Developer of the Original Code is
 * Netscape Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2003
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s): Bob Clary <bclary@netscape.com>
 *
 * ***** END LICENSE BLOCK ***** */

ihg_Functions.CCallWrapper = function CCallWrapper(aObjectReference, aDelay, aMethodName, aReqId) {
	this.mId = 'CCallWrapper_' + (ihg_Functions.CCallWrapper.mCounter++);
	ihg_Functions.LOG("Initializing new CCallWrapper object with mId of " + this.mId + " and reqID of " + aReqId + "\n");
	this.mObjectReference = aObjectReference;
	this.mDelay = aDelay;
	this.mTimerId = 0;
	this.mMethodName = aMethodName;
	this.mReqId = aReqId;
	ihg_Functions.CCallWrapper.mPendingCalls[this.mId] = this;
	}

ihg_Functions.CCallWrapper.prototype.execute = function() {
	ihg_Functions.LOG("CCallWrapper object with mId of " + this.mId + " and reqID of " + this.mReqId + " has timed out. Executing the passed function '" + this.mMethodName + "'\n");
	this.mObjectReference[this.mMethodName]();
	delete ihg_Functions.CCallWrapper.mPendingCalls[this.mId];
	};

ihg_Functions.CCallWrapper.prototype.cancel = function() {
	ihg_Functions.LOG("CCallWrapper object with mId of " + this.mId + " and reqID of " + this.mReqId + " cancelled.[" + this.mMethodName + "]\n");
	clearTimeout(this.mTimerId);
	delete ihg_Functions.CCallWrapper.mPendingCalls[this.mId];
	};

ihg_Functions.CCallWrapper.asyncExecute = function (/* CCallWrapper */ callwrapper) {
	ihg_Functions.LOG("asyncExecute called in CCallWrapper with mId of " + callwrapper.mId + " and reqID of " + callwrapper.mReqId + "\n");
	ihg_Functions.CCallWrapper.mPendingCalls[callwrapper.mId].mTimerId = setTimeout(self => self.execute(), callwrapper.mDelay, ihg_Functions.CCallWrapper.mPendingCalls[callwrapper.mId]);
	};

ihg_Functions.CCallWrapper.mCounter = 0;
ihg_Functions.CCallWrapper.mPendingCalls = {};