/* eslint-disable no-lonely-if */
const { randomOf } = require('@reverse/random');

let dodging = false;
let dodgingCounter = 0;

let hasSentQuickChat = false;

class PiusBot extends BaseAgent {
  constructor(name, team, index, fieldInfo) {
    super(name, team, index, fieldInfo);
  }

  
  getOutput(gameTickPacket, ballPrediction) {
    this.renderer.beginRendering();
    
    // Right goal post.
    this.renderer.drawLine3D(new Vector3(gameTickPacket.ball.physics.location.x, gameTickPacket.ball.physics.location.y, 17), new Vector3(-893, 5120, 17), new this.renderer.Color(0, 0, 255, 0));
    const rightX = -893 - gameTickPacket.ball.physics.location.x;
    const rightY = 5120 - gameTickPacket.ball.physics.location.y;
    const rightSlope = rightY / rightX;
    const rightYIntercept = 5120 - rightSlope * -893;
    this.renderer.drawLine3D(new Vector3(gameTickPacket.ball.physics.location.x, gameTickPacket.ball.physics.location.y, 17), new Vector3(rightSlope > 0 ? -4096 : 4096, rightSlope * (rightSlope > 0 ? -4096 : 4096) + rightYIntercept, 17), new this.renderer.Color(0, 0, 255, 0));
    
    // Left goal post.
    this.renderer.drawLine3D(new Vector3(gameTickPacket.ball.physics.location.x, gameTickPacket.ball.physics.location.y, 17), new Vector3(893, 5120, 17), new this.renderer.Color(0, 0, 255, 0));
    const leftX = 893 - gameTickPacket.ball.physics.location.x;
    const leftY = 5120 - gameTickPacket.ball.physics.location.y;
    const leftSlope = leftY / leftX;
    console.log(leftSlope)
    const leftYIntercept = 5120 - leftSlope * 893;
    this.renderer.drawLine3D(new Vector3(gameTickPacket.ball.physics.location.x, gameTickPacket.ball.physics.location.y, 17), new Vector3(leftSlope < 0 ? 4096 : -4096, leftSlope * (leftSlope < 0 ? 4096 : -4096) + leftYIntercept, 17), new this.renderer.Color(0, 0, 255, 0));


    this.renderer.endRendering();
        
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
        // If it's a kickoff.
        console.log('PiusBot: ITS ROBOT FIGHTING TIME!');

        hasSentQuickChat = false;

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
        // If we are not in the right position to hit the ball.
        console.log('PiusBot: Incorrect linup.');

        if(ballLocation.y - carLocation.y < 2000) {
          // Turn.
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
          // Turn to ball.
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
      // If we infront of the ball.
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
    if(Math.round(carLocation.z) > 150) {
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

    // If we score.
    if(ballPrediction.slices[10].physics.location.y > 5120) {
      if(!hasSentQuickChat) {
        this.sendQuickChat(randomOf([45, 12, 47]), false);
        hasSentQuickChat = true;
      }
    }

    // If we get scored on.
    if(ballPrediction.slices[10].physics.location.y < -5120) {
      if(!hasSentQuickChat) {
        this.sendQuickChat(randomOf([44, 46, 48]), false);
        hasSentQuickChat = true;
      }
    }

    return controller;
  }
}

const manager = new Manager(PiusBot);
manager.start();
