const { BaseAgent, SimpleController, quickChats, Manager } = require('rlbot-test');
const { GameState, BallState, CarState, Physics, Vector3 } = require('rlbot-test').GameStateUtil;

class ATBA extends BaseAgent {
  constructor(name, team, index, fieldInfo) {
    super(name, team, index, fieldInfo);
  }

  
  getOutput(gameTickPacket) {
    const controller = new SimpleController();

    if (!gameTickPacket.gameInfo.isRoundActive) {
      return controller;
    }

    const ballLocation = gameTickPacket.ball.physics.location;
    const carLocation = gameTickPacket.players[this.index].physics.location;
    const carRotation = gameTickPacket.players[this.index].physics.rotation;

    // Calculate to get the angle from the front of the bot's car to the ball.
    const botToTargetAngle = Math.atan2(ballLocation.y - carLocation.y, ballLocation.x - carLocation.x);
    let botFrontToTargetAngle = botToTargetAngle - carRotation.yaw;

    // // Correct the angle
    if (botFrontToTargetAngle < -Math.PI) {botFrontToTargetAngle += 2 * Math.PI;}
    if (botFrontToTargetAngle > Math.PI) {botFrontToTargetAngle -= 2 * Math.PI;}

    // // Decide which way to steer in order to get to the ball.
    
    this.renderer.beginRendering();
    this.renderer.drawString2D(20, 20, 3, 3, `BallLoc: ${ballLocation.x}`, new this.renderer.Color(255, 255, 0, 0));
    this.renderer.drawString2D(20, 60, 3, 3, `CarLog: ${carLocation.x}`, new this.renderer.Color(255, 255, 0, 0));
    this.renderer.drawString2D(20, 100, 3, 3, `Angle: ${botFrontToTargetAngle}`, new this.renderer.Color(255, 255, 0, 0));
    this.renderer.drawString2D(20, 140, 3, 3, `CarYaw: ${carRotation.yaw}`, new this.renderer.Color(255, 255, 0, 0));
    this.renderer.drawString2D(20, 180, 3, 3, `VDist: ${ballLocation.y - carLocation.y}`, new this.renderer.Color(255, 255, 0, 0));
    
    this.renderer.endRendering();

    // If we are behind the ball.
    if(ballLocation.y > carLocation.y) {
      const distance = ballLocation.y > carLocation.y;

      if(ballLocation.x < carLocation.x && carLocation.x > 0 || ballLocation.x > carLocation.x && carLocation.x < 0) {
        if(botFrontToTargetAngle > 0) {
          controller.steer = 0.5;
        }else if(botFrontToTargetAngle < 0) {
          controller.steer = -0.5;
        }
        console.log('Correct lineup');
      }else {
        // eslint-disable-next-line no-lonely-if
        if(distance > 750) {
          if(ballLocation.x < carLocation.x) {
            controller.steer = -0.5;
          }else if(ballLocation.x > carLocation.x) {
            controller.steer = 0.5;
          }
        }

        controller.boost = true;
        console.log('Incorrect lineup');
      }

      controller.throttle = 1;
    }else {
      const distance = carLocation.y - ballLocation.y;
      
      if(distance > 1250) {
        if(botFrontToTargetAngle > 0) {
          controller.steer = 1;
        }else if(botFrontToTargetAngle < 0) {
          controller.steer = -1;
        }
      }else {
        controller.boost = true;
      }

      console.log('behind the ball');

      controller.throttle = 1;
    }
    
    return controller;
  }
}

const manager = new Manager(ATBA);
manager.start();
