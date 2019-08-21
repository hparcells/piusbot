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
    this.renderer.drawLine3D(new Vector3(gameTickPacket.ball.physics.location.x, gameTickPacket.ball.physics.location.y, 17), new Vector3(-893 * teamMultiplier, 5120 * teamMultiplier, 17), new this.renderer.Color(0, 255, 0, 0));
    const rightX = -893 * teamMultiplier - gameTickPacket.ball.physics.location.x;
    const rightY = 5120 * teamMultiplier - gameTickPacket.ball.physics.location.y;
    const rightSlope = rightY / rightX;
    const rightYIntercept = 5120 * teamMultiplier - rightSlope * (-893 * teamMultiplier);
    this.renderer.drawLine3D(new Vector3(gameTickPacket.ball.physics.location.x, gameTickPacket.ball.physics.location.y, 17), new Vector3(
      rightSlope > 0 ? -4096 * teamMultiplier : 4096 * teamMultiplier,
      rightSlope * (rightSlope > 0 ? -4096 * teamMultiplier : 4096 * teamMultiplier) + rightYIntercept,
      17
    ), new this.renderer.Color(0, 0, 255, 0));
    
    // Left goal post.
    this.renderer.drawLine3D(new Vector3(gameTickPacket.ball.physics.location.x, gameTickPacket.ball.physics.location.y, 17), new Vector3(893 * teamMultiplier, 5120 * teamMultiplier, 17), new this.renderer.Color(0, 255, 0, 0));
    const leftX = 893 * teamMultiplier - gameTickPacket.ball.physics.location.x;
    const leftY = 5120 * teamMultiplier - gameTickPacket.ball.physics.location.y;
    const leftSlope = leftY / leftX;
    const leftYIntercept = 5120 * teamMultiplier - leftSlope * (893 * teamMultiplier);
    this.renderer.drawLine3D(new Vector3(gameTickPacket.ball.physics.location.x, gameTickPacket.ball.physics.location.y, 17), new Vector3(
      leftSlope < 0 ? 4096 * teamMultiplier : -4096 * teamMultiplier,
      leftSlope * (leftSlope < 0 ? 4096 * teamMultiplier : -4096 * teamMultiplier) + leftYIntercept,
      17
    ), new this.renderer.Color(0, 0, 255, 0));


    this.renderer.drawString3D(new Vector3(carLocation.x, carLocation.y, carLocation.z + 100), 1, 1, `Position: ${(ballLocation.y - carLocation.y) * teamMultiplier > 0 ? 'Infront' : 'Behind'}`, new this.renderer.Color(255, 0, 255, 0));

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
      if(inside([carLocation.x, carLocation.y], [
        [893 * teamMultiplier, 5120 * teamMultiplier],
        [-893 * teamMultiplier, 5120 * teamMultiplier],
        [ballLocation.x, ballLocation.y]
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

          if(ballLocation.y - carLocation.y < 350) {
            forwardDodge();
          }
        }
      }else {
        // -180
        console.log(`${this.name}: ${Math.round(carRotation.yaw * (180 / Math.PI))}`);
        if(carLocation.x * -teamMultiplier > ballLocation.x) {
          if(Math.round(carRotation.yaw * (180 / Math.PI)) > -180) {
            controller.steer = 1;
          }else {
            controller.boost = true;
          }
          // 0
        }else if(carLocation.x * -teamMultiplier < ballLocation.x) {
          if(Math.round(carRotation.yaw * (180 / Math.PI)) > 0) {
            controller.steer = -1;
          }else {
            controller.boost = true;
          }
        }
        controller.throttle = 1;
      }
    }else {
      // If we infront of the ball.
      this.renderer.drawString3D(new Vector3(carLocation.x - 200, carLocation.y, carLocation.z + 100), 1, 1, 'Rotating Back.', new this.renderer.Color(255, 0, 255, 0));

      if(carLocation.x * -teamMultiplier > ballLocation.x) {
        if(Math.round(carRotation.yaw * (180 / Math.PI)) > 80 * teamMultiplier || Math.round(carRotation.yaw * (180 / Math.PI)) < 100 * teamMultiplier) {
          controller.steer = -1;
        }else {
          forwardDodge();
          if(!dodging && Math.round(carRotation.pitch) === 0) {
            controller.boost = true;
          }
        }
      }else if(carLocation.x * -teamMultiplier < ballLocation.x) {
        if(Math.round(carRotation.yaw * (180 / Math.PI)) > 80 * teamMultiplier || Math.round(carRotation.yaw * (180 / Math.PI)) < 100 * teamMultiplier) {
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

    this.renderer.endRendering();

    return controller;
  }
}

const manager = new Manager(PiusBot);
manager.start();
