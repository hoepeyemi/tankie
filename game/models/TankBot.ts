import TankPlayer from '@game/models/TankPlayer';
import type Game from '@game/scenes/Game';
import { THREE } from 'enable3d';

const BOT_NAMES = [
    'Shadow', 'Reaper', 'Maverick', 'Ghost', 'Viper', 'Titan', 'Apex', 'Phantom', 
    'Striker', 'Wraith', 'Nova', 'Blaze', 'Cosmos', 'Echo', 'Fury', 'Havoc', 
    'Jester', 'Kraven', 'Lycan', 'Nimble', 'Odin', 'Punisher', 'Quake', 'Ronin'
];

export default class TankBot extends TankPlayer {
    private nextActionTime: number = 0;
    private targetPoint?: THREE.Vector3;
    private stuckTimer: number = 0;
    private reversingTimer: number = 0;
    private isTeleporting: boolean = false;

    constructor(game: Game, position: THREE.Vector3, uuid?: string) {
        super(game, position, uuid);
        this.pseudo = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    }

    public update(delta: number) {
        super.update(delta);

        if (this.isTeleporting) return;

        // Anti-void safety net for un-loaded physics chunks
        if (this.position.y < -20 && this.game.player) {
            this.isTeleporting = true;
            const safePos = this.game.player.position.clone();
            safePos.x += (Math.random() - 0.5) * 30;
            safePos.z += (Math.random() - 0.5) * 30;

            this.game.world.getPosition(safePos.x, safePos.z).then(finalPos => {
                finalPos.y += 2; // Drop gently from 2m above ground
                void this.teleport(finalPos).then(() => {
                    this.isTeleporting = false;
                });
            });
            return;
        }

        if (this.game.matchState === 'OVER' || this.isDead()) {
            this.engineForce = 0;
            this.steering = 0;
            this.breakingForce = 100;
            return;
        }

        const upVector = new THREE.Vector3(0, 1, 0).applyQuaternion(this.chassis.quaternion);
        const isUpsideDown = upVector.y < 0.2; // 0 is exactly 90 degrees tipped

        // Anti-stuck & flip logic
        if (isUpsideDown || (Math.abs(this.speed) < 2 && this.engineForce > 0 && this.breakingForce === 0)) {
            this.stuckTimer += delta;
        } else {
            this.stuckTimer = 0;
        }

        if (this.stuckTimer > 2000) { // Stuck/flipped for 2 seconds
            if (isUpsideDown) {
                // If flipped, auto-right them gently
                void this.resetPosition();
                this.stuckTimer = 0;
                this.reversingTimer = 0;
                return;
            } else {
                this.reversingTimer = 1500; // Reverse for 1.5 seconds
                this.stuckTimer = 0;
            }
        }

        if (this.reversingTimer > 0) {
            this.reversingTimer -= delta;
            this.engineForce = -1500; // Powerful reverse
            this.breakingForce = 0;
            this.steering = 1; // Turn while reversing to shake loose
            return;
        }

        const now = Date.now();

        // Find the closest target every 500ms
        if (now > this.nextActionTime) {
            this.nextActionTime = now + 500;

            // Find closest living enemy
            let closestEnemy: any = null;
            let closestDist = Infinity;

            this.game.tanks.array.forEach(tank => {
                if (tank !== this && !tank.isDead()) {
                    const { distance } = this.getDistanceTo(tank);
                    if (distance < closestDist) {
                        closestEnemy = tank;
                        closestDist = distance;
                    }
                }
            });

            if (closestEnemy) {
                const targetPos = closestEnemy.position.clone();
                this.targetPoint = targetPos;

                // 1. Aim Turret
                const turretWorldDir = this.turret.getWorldDirection(new THREE.Vector3());
                // Calculate angle difference in the XZ plane
                const angleToTarget = Math.atan2(targetPos.x - this.position.x, targetPos.z - this.position.z);
                const currentTurretAngle = Math.atan2(turretWorldDir.x, turretWorldDir.z);

                let diff = angleToTarget - currentTurretAngle;
                // Normalize diff to -PI, PI
                while (diff <= -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;

                this.turretAngle = this.turretAngle + (diff * 0.5); // Move towards target slowly

                // 2. Shoot if pointing relatively close
                if (Math.abs(diff) < 0.2 && closestDist < 50) {
                    this.shoot();
                }

                // 3. Drive towards target
                const chassisWorldDir = this.chassis.getWorldDirection(new THREE.Vector3());
                const currentChassisAngle = Math.atan2(chassisWorldDir.x, chassisWorldDir.z);

                let steerDiff = angleToTarget - currentChassisAngle;
                while (steerDiff <= -Math.PI) steerDiff += Math.PI * 2;
                while (steerDiff > Math.PI) steerDiff -= Math.PI * 2;

                this.steering = steerDiff;

                if (closestDist > 30) {
                    this.engineForce = 1500;
                    this.breakingForce = 0;
                } else if (closestDist > 15) {
                    this.engineForce = 500;
                    this.breakingForce = 0;
                } else {
                    this.engineForce = 0;
                    this.breakingForce = 100;
                }
            } else {
                // No target, just wander
                this.engineForce = 1000;
                this.breakingForce = 0;
                if (Math.random() < 0.1) {
                    this.steering = (Math.random() - 0.5) * 2;
                }
            }
        }
    }
}
