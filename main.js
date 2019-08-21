/* eslint-disable no-lonely-if */
const { randomOf } = require('@reverse/random');
const inside = require('point-in-triangle');

const { BaseAgent, SimpleController, Manager } = require('rlbot-test');
const { Vector3 } = require('rlbot-test').GameStateUtil;

let dodging = false;
let dodgingCounter = 0;

let hasSentQuickChat = false;

class PiusBot extends BaseAgent {
  constructor(name, team, index, fieldInfo) {
    super(name, team, index, fieldInfo);
  }

  getOutput(gameTickPacket, ballPrediction) {
    const teamMultiplier = this.team + this.team - 1;

    const ballLocation = gameTickPacket.ball.physics.location;
    const carLocation = gameTickPacket.players[this.index].physics.location;
    const carRotation = gameTickPacket.players[this.index].physics.rotation;
    
    this.renderer.beginRendering();
    
    // Right goal post.
    this.renderer.drawLine3D(new Vector3(gameTickPacket.ball.physics.location.x, gameTickPacket.ball.physics.location.y, 17), new Vector3(-893 * -teamMultiplier, 5120 * -teamMultiplier, 17), new this.renderer.Color(0, 255, 0, 0));
    const rightX = (-893 * -teamMultiplier) - gameTickPacket.ball.physics.location.x;
    const rightY = (5120 * -teamMultiplier) - gameTickPacket.ball.physics.location.y;
    const rightSlope = rightY / rightX;
    const rightYIntercept = (5120 * -teamMultiplier) - rightSlope * (-893 * -teamMultiplier);

    this.renderer.drawLine3D(new Vector3(gameTickPacket.ball.physics.location.x, gameTickPacket.ball.physics.location.y, 17), new Vector3(
      rightSlope > 0 ? -4096 * -teamMultiplier : 4096 * -teamMultiplier,
      rightSlope * (rightSlope > 0 ? -4096 * -teamMultiplier : 4096 * -teamMultiplier) + rightYIntercept,
      17
    ), new this.renderer.Color(0, 0, 255, 0));
    
    // Left goal post.
    this.renderer.drawLine3D(new Vector3(gameTickPacket.ball.physics.location.x, gameTickPacket.ball.physics.location.y, 17), new Vector3(893 * -teamMultiplier, 5120 * -teamMultiplier, 17), new this.renderer.Color(0, 255, 0, 0));
    const leftX = (893 * -teamMultiplier) - gameTickPacket.ball.physics.location.x;
    const leftY = (5120 * -teamMultiplier) - gameTickPacket.ball.physics.location.y;
    const leftSlope = leftY / leftX;
    const leftYIntercept = (5120 * -teamMultiplier) - leftSlope * (893 * -teamMultiplier);
    this.renderer.drawLine3D(new Vector3(gameTickPacket.ball.physics.location.x, gameTickPacket.ball.physics.location.y, 17), new Vector3(
      leftSlope < 0 ? 4096 * -teamMultiplier : -4096 * -teamMultiplier,
      leftSlope * (leftSlope < 0 ? 4096 * -teamMultiplier : -4096 * -teamMultiplier) + leftYIntercept,
      17
    ), new this.renderer.Color(0, 0, 255, 0));

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

    const botToTargetAngle = Math.atan2(ballLocation.y - carLocation.y, ballLocation.x - carLocation.x);
    let botFrontToTargetAngle = botToTargetAngle - carRotation.yaw;

    // // Correct the angle
    if (botFrontToTargetAngle < -Math.PI) {botFrontToTargetAngle += 2 * Math.PI;}
    if (botFrontToTargetAngle > Math.PI) {botFrontToTargetAngle -= 2 * Math.PI;}
    
    // If we are behind the ball.
    if(teamMultiplier === -1 && ballLocation.y > carLocation.y || teamMultiplier === 1 && ballLocation.y < carLocation.y) {
      if(ballLocation.x === 0 && ballLocation.y == 0) {
        if(botFrontToTargetAngle > 0.1) {
          controller.steer = 1;
        }else if(botFrontToTargetAngle < -0.1) {
          controller.steer = -1;
        }else {
          if(Math.max(ballLocation.y, carLocation.y) - Math.min(ballLocation.y, carLocation.y) < 350) {
            forwardDodge();
          }
        }
        controller.throttle = 1;
        controller.boost = true;
      }else if(inside([carLocation.x, carLocation.y], [
        [ballLocation.x, ballLocation.y],
        [rightSlope > 0 ? -4096 * -teamMultiplier : 4096 * -teamMultiplier, rightSlope * (rightSlope > 0 ? -4096 * -teamMultiplier : 4096 * -teamMultiplier) + rightYIntercept],
        [leftSlope < 0 ? 4096 * -teamMultiplier : -4096 * -teamMultiplier, leftSlope * (leftSlope < 0 ? 4096 * -teamMultiplier : -4096 * -teamMultiplier) + leftYIntercept]
      ])) {
        if(botFrontToTargetAngle > 0.1) {
          controller.steer = 1;
          controller.throttle = 0.5;
        }else if(botFrontToTargetAngle < -0.1) {
          controller.steer = -1;
          controller.throttle = 0.5;
        }else {
          controller.boost = true;
          controller.throttle = 1;

          if(Math.max(ballLocation.y, carLocation.y) - Math.min(ballLocation.y, carLocation.y) < 350) {
            forwardDodge();
          }
        }
      }else {
        // TODO: Make this 10000000x better.
        if((teamMultiplier === -1 && carLocation.x > ballLocation.x) || (teamMultiplier === 1 && carLocation.x < ballLocation.x)) {
          if(botFrontToTargetAngle > -1.1) {
            controller.steer = 1;
            controller.throttle = 0.5;
          }else if(botFrontToTargetAngle < -0.9) {
            controller.steer = -1;
            controller.throttle = 0.5;
          }else {
            controller.throttle = 1;
          }
        }else {
          if(botFrontToTargetAngle > 1.1) {
            controller.steer = 1;
            controller.throttle = 0.5;
          }else if(botFrontToTargetAngle < 0.9) {
            controller.steer = -1;
            controller.throttle = 0.5;
          }else {
            controller.boost = true;
            controller.throttle = 1;
  
            if(Math.max(ballLocation.y, carLocation.y) - Math.min(ballLocation.y, carLocation.y) < 350) {
              forwardDodge();
            }
          }
        }
      }
    }else {
      // If we infront of the ball.
      if((teamMultiplier === -1 && carLocation.x > ballLocation.x) || (teamMultiplier === 1 && carLocation.x < ballLocation.x)) {
        if(Math.round(carRotation.yaw * (180 / Math.PI)) * teamMultiplier > 80 && Math.round(carRotation.yaw * (180 / Math.PI)) * teamMultiplier < 100) {
          if(Math.round(carRotation.roll) === 0) {
            forwardDodge();
          }
          if(!dodging && Math.round(carRotation.pitch) === 0) {
            controller.boost = true;
          }
        }else {
          controller.steer = -1;
        }
      }else {
        if(Math.round(carRotation.yaw * (180 / Math.PI)) * teamMultiplier > 80 && Math.round(carRotation.yaw * (180 / Math.PI)) * teamMultiplier < 100) {
          if(Math.round(carRotation.roll) === 0) {
            forwardDodge();
          }
          if(!dodging && Math.round(carRotation.pitch) === 0) {
            controller.boost = true;
          }
        }else {
          controller.steer = 1;
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

    // If we are too high.
    if(carLocation.z > 1000) {
      controller.jump = true;
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

    this.renderer.endRendering();

    return controller;
  }
}

const manager = new Manager(PiusBot);
manager.start();
