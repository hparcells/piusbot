const { BaseAgent, SimpleController, quickChats, Manager } = require('rlbot-test');
const { GameState, BallState, CarState, Physics, Vector3 } = require('rlbot-test').GameStateUtil;

let dodging = false;
let dodgingCounter = 0;

class PiusBot extends BaseAgent {
  constructor(name, team, index, fieldInfo) {
    super(name, team, index, fieldInfo);
  }

  
  getOutput(gameTickPacket) {
    const controller = new SimpleController();

    // Check if a round is active.
    if (!gameTickPacket.gameInfo.isRoundActive) {
      return controller;
    }

    // Helper functions.
    function forwardDodge() {
      dodging = true;

      if (dodging) {
        controller.pitch = -1.0;
        if (dodgingCounter < 5) {
          controller.jump = true;
          dodgingCounter++;
        } else if (dodgingCounter < 10) {
          controller.jump = false;
          dodgingCounter++;
        } else if (dodgingCounter < 15) {
          controller.jump = true;
          dodgingCounter++;
        } else if (dodgingCounter < 20) {
          controller.jump = false;
          dodgingCounter = 0;
          dodging = false;
        }
      }
    }

    const ballLocation = gameTickPacket.ball.physics.location;
    const carLocation = gameTickPacket.players[this.index].physics.location;
    const carRotation = gameTickPacket.players[this.index].physics.rotation;

    const botToTargetAngle = Math.atan2(ballLocation.y - carLocation.y, ballLocation.x - carLocation.x);
    let botFrontToTargetAngle = botToTargetAngle - carRotation.yaw;

    // // Correct the angle
    if (botFrontToTargetAngle < -Math.PI) {botFrontToTargetAngle += 2 * Math.PI;}
    if (botFrontToTargetAngle > Math.PI) {botFrontToTargetAngle -= 2 * Math.PI;}
    
    if(ballLocation.y > carLocation.y) {
      // If we have a correct lineup.
      if(
        // If we are in Q1.
        ballLocation.x > 0 && ballLocation.y > 0 && carLocation.x > 0 && ballLocation.y > 0 && ballLocation.x < carLocation.x
        // If we are in Q2.
        || ballLocation.x < 0 && ballLocation.y > 0 && carLocation.x < 0 && ballLocation.y > 0 && ballLocation.x > carLocation.x
        // If we are in Q3 or Q4.
        || ballLocation.y < 0 && carLocation.y < 0
      ) {
        console.log('PiusBot: Correct lineup.');
        if(botFrontToTargetAngle > 0.1) {
          controller.steer = 1;
          controller.throttle = 0.5;
        }else if(botFrontToTargetAngle < -0.1) {
          controller.steer = -1;
          controller.throttle = 0.5;
        }else {
          controller.boost = true;
          controller.throttle = 1;

          if(ballLocation.y - carLocation.y < 350) {
            forwardDodge();
          }
        }
      }else if(ballLocation.x === 0 && ballLocation.y === 0) {
        console.log('PiusBot: ITS ROBOT FIGHTING TIME!');

        // eslint-disable-next-line no-lonely-if
        if(botFrontToTargetAngle > 0.1) {
          controller.steer = 1;
        }else if(botFrontToTargetAngle < -0.1) {
          controller.steer = -1;
        }else if(ballLocation.y - carLocation.y < 550) {
          forwardDodge();
        }
        controller.boost = true;
        controller.throttle = 1;
      }else {
        console.log('PiusBot: Incorrect linup.');

        if(ballLocation.y - carLocation.y < 2000) {
          if(ballLocation.x > carLocation.x) {
            if(Math.round(carRotation.yaw * (180 / Math.PI)) > -80 || Math.round(carRotation.yaw * (180 / Math.PI)) < -100) {
              controller.steer = -1;
            }
          }else if(ballLocation.x < carLocation.x) {
            if(Math.round(carRotation.yaw * (180 / Math.PI)) > -80 || Math.round(carRotation.yaw * (180 / Math.PI)) < -100) {
              controller.steer = 1;
            }
          }
        }else {
          // eslint-disable-next-line no-lonely-if
          if(botFrontToTargetAngle > 0.1) {
            controller.steer = 1;
            controller.throttle = 0.5;
          }else if(botFrontToTargetAngle < -0.1) {
            controller.steer = -1;
            controller.throttle = 0.5;
          }else {
            controller.boost = true;
            controller.throttle = 1;
          }
        }

        controller.throttle = 1;
      }
    }else {
      console.log('PiusBot: I shouldn\'t be here.');

      if(carLocation.x > 0) {
        if(Math.round(carRotation.yaw * (180 / Math.PI)) > -80 || Math.round(carRotation.yaw * (180 / Math.PI)) < -100) {
          controller.steer = -1;
        }else {
          forwardDodge();
          if(!dodging && Math.round(carRotation.pitch) === 0) {
            controller.boost = true;
          }
        }
      }else if(carLocation.x < 0) {
        if(Math.round(carRotation.yaw * (180 / Math.PI)) > -80 || Math.round(carRotation.yaw * (180 / Math.PI)) < -100) {
          controller.steer = 1;
        }else {
          forwardDodge();
          if(!dodging && Math.round(carRotation.pitch) === 0) {
            controller.boost = true;
          }
        }
      }
      controller.throttle = 1;
    }

    // If the car falls off a wall or the ceiling.
    if(Math.round(carLocation.z) > 120) {
      if(carRotation.roll > 0.5) {
        controller.roll = -1;
      }
      if(carRotation.roll < -0.5) {
        controller.roll = 1;
      }
      if(carRotation.pitch > 0.5) {
        controller.pitch = -1;
      }
      if(carRotation.pitch < -0.5) {
        controller.pitch = 1;
      }
    }

    return controller;
  }
}

const manager = new Manager(PiusBot);
manager.start();
