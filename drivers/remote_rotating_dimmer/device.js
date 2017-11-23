'use strict';

const Homey = require('homey');
const ZigBeeDevice = require('homey-meshdriver').ZigBeeDevice;

const maxValue = 255;

class RemoteRotatingDimmer extends ZigBeeDevice {

	onMeshInit() {
		this.value = 255;
		this.moveRate = 0;
		this.sensitivity = -1;
		this.updateSpeedMs = 200;
		this.movesInaRow = 0;
		this.sensativityPerUpdate = 0;
		this.updateSensativity();

		// Register report listeners
		this.registerReportListener('genLevelCtrl', 'move', this.moveCommandParser.bind(this));
		this.registerReportListener('genLevelCtrl', 'moveWithOnOff', this.moveCommandParser.bind(this));
		this.registerReportListener('genLevelCtrl', 'stop', this.stopCommandParser.bind(this));
		this.registerReportListener('genLevelCtrl', 'stopWithOnOff', this.stopCommandParser.bind(this));
		this.registerReportListener('genLevelCtrl', 'moveToLevelWithOnOff', payload => {
			//this.log('moving to level',payload);			
			this.value = payload.level;
		});

		// Register dimmer_rotated Flow Card Device Trigger
		this.dimmerRotatedTriggerDevice = new Homey.FlowCardTriggerDevice('dimmer_rotated');
		this.dimmerRotatedTriggerDevice.register();
		this.log('init',{sens: this.sensitivity, spd: this.updateSpeedMs, max:maxValue});
		this.timer = setInterval(() => {
			if(this.moveRate != 0){
				this.value += this.moveRate;
				//this.log('update, value ' + this.value);
				if(this.value > maxValue){
					this.value = maxValue;
					this.moveRate = 0;
				} else if(this.value < 0){
					this.value = 0;
					this.moveRate = 0;
				}
				const parsedValue = Math.round(this.value * 100.0 / maxValue) / 100;
				
				return this.dimmerRotatedTriggerDevice.trigger(this, { value: parsedValue }, null)
					//.then(() => this.log(`triggered dimmer_rotated, value ${parsedValue}`))
					.catch(err => this.error('Error triggering dimmer_rotated', err));
				
			}
		},this.updateSpeedMs);

	}

	updateSensativity(){
		var s = this.getSetting('sensitivity');
		if(s && !isNaN(s)) {
			if(s == this.sensitivity)
				return;
			this.sensitivity = s;
		}
		if(!this.sensitivity || isNaN(this.sensitivity)){
			this.sensitivity = 1;
		}
		this.log('sensativity adjusted ' + this.sensitivity);
		this.sensativityPerUpdate = this.sensitivity*this.updateSpeedMs / 1000.0;
	}

	/**
	 * Method that parsed an incoming move report
	 * @param payload
	 * @returns {*}
	 */
	moveCommandParser(payload) {
		this.updateSensativity();
		this.moveRate = (-2.0*payload.movemode + 1.0) * this.sensativityPerUpdate * payload.rate;
		this.movesInaRow++;
		if(this.movesInaRow > 10){ stop(); } //to avoid bug-looking thingy where stop is never called
		//this.log('moving ' + this.moveRate + ' -- ' + this.movesInaRow);
	}

	/**
	 * Method that parsed an incoming stop report
	 * @returns {*}
	 */
	stopCommandParser() {
		this.moveRate = 0;
		this.movesInaRow = 0;
		//this.log('stop',this.moveRate);
	}
}

module.exports = RemoteRotatingDimmer;
