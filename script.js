class RouletteWheel {
    constructor() {
        this.canvas = document.getElementById('wheel');
        this.ctx = this.canvas.getContext('2d');
        this.spinBtn = document.getElementById('spinBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.itemsTextarea = document.getElementById('itemsTextarea');
        this.modal = document.getElementById('resultModal');
        this.closeModal = document.getElementById('closeModal');
        this.resultText = document.getElementById('resultText');
        
        this.items = Array.from({length: 37}, (_, i) => i.toString());
        this.colors = [];
        this.currentRotation = 0;
        this.isSpinning = false;
        
        // 輪盤樣式參數（縮小0.9倍）
        this.trackWidth = 63;        // 70 * 0.9
        this.outerRimWidth = 15;     // 17 * 0.9 (約)
        this.innerTrackWidth = 48;   // 53 * 0.9 (約)
        
        // 輪盤持續旋轉相關
        this.wheelRotationSpeed = 0.005; // 輪盤基礎旋轉速度
        this.animationId = null;
        
        // 小球相關屬性
        this.ball = {
            angle: 0,
            radius: 0,  // 會在 getBallRadius() 中動態計算
            x: 0,
            y: 0,
            speed: 0,
            friction: 0.995,  // 增加摩擦力讓球在外圍轉更久
            dropSpeed: 0,     // 掉落速度
            isDropping: false, // 是否開始掉落
            finalSlot: -1,
            settling: false
        };
        
        // 用於存儲 setTimeout 的 ID
        this.resultTimeoutId = null;
        
        // x_gun 圖片相關
        this.xGunImage = new Image();
        this.xGunImage.src = 'x_gun.png';
        this.showXGun = false;
        this.xGunSlot = -1;
        
        // bull_bone 圖片相關
        this.bullBoneImage = new Image();
        this.bullBoneImage.src = 'bull_bone.png';
        
        
        this.init();
    }
    
    getBallTrackRadius() {
        // 小球在內軌道中央的位置
        const baseNumberRadius = 252;  // 配合調整
        return baseNumberRadius + (this.innerTrackWidth / 2);
    }
    
    init() {
        this.setupEventListeners();
        this.updateTextarea();
        this.updateColors();
        this.drawWheel();
        this.startAnimation();
    }
    
    setupEventListeners() {
        this.spinBtn.addEventListener('click', () => this.spin());
        this.shuffleBtn.addEventListener('click', () => this.shuffleItems());
        this.closeModal.addEventListener('click', () => this.hideModal());
        
        this.itemsTextarea.addEventListener('input', () => {
            this.updateItemsFromTextarea();
        });
    }
    
    updateColors() {
        this.colors = [];
        const itemCount = this.items.length;
        
        for (let i = 0; i < itemCount; i++) {
            if (itemCount % 2 === 1 && i === itemCount - 1) {
                this.colors.push('#00a65a');
            } else {
                this.colors.push(i % 2 === 0 ? '#dc3545' : '#343a40');
            }
        }
    }
    
    updateTextarea() {
        this.itemsTextarea.value = this.items.join('\n');
    }
    
    updateItemsFromTextarea() {
        const text = this.itemsTextarea.value.trim();
        if (text) {
            this.items = text.split('\n').filter(item => item.trim() !== '');
        } else {
            this.items = [];
        }
        this.updateColors();
        this.drawWheel();
    }
    
    shuffleItems() {
        for (let i = this.items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
        }
        this.updateTextarea();
        this.drawWheel();
    }
    
    startAnimation() {
        
        const animate = () => {
            // 輪盤持續旋轉（無論是否在抽選中）
            this.currentRotation += this.wheelRotationSpeed;
            
            // 繪製輪盤
            this.drawWheel();
            
            // 更新小球位置（根據不同狀態）
            if (this.isSpinning && !this.ball.settling) {
                // 遊戲進行中且球還沒停下，繼續更新
                this.updateBall();
                
                // 檢查球速度是否歸零（決定遊戲結束）
                if (this.ball.speed === 0) {                
                    this.ball.settling = true;
                    this.ball.isDropping = false;

                    this.determineFinalSlot();
                }
            } else if (this.ball.settling && this.ball.finalSlot >= 0) {
                // 球已經停下，跟著輪盤轉動
                this.updateBallWithWheel();
            }
            
            // 繪製小球（如果正在旋轉，或者球已經落下且有固定位置）
            if (this.isSpinning || this.ball.radius < this.getBallTrackRadius() || this.ball.finalSlot >= 0) {
                this.drawBall();
            }
            
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }
    
    updateBall() {
        // 小球角度增加（相對於輪盤反向旋轉）
        this.ball.angle += this.ball.speed;
        
        // 減速
        this.ball.speed *= this.ball.friction;
        
        // 當速度減慢到一定程度時，開始掉落（使用絕對值判斷）
        if (Math.abs(this.ball.speed) < 0.02 && !this.ball.isDropping && !this.ball.settling) {
            this.ball.isDropping = true;
            this.ball.dropSpeed = 0.2;
        }
        
        // 如果正在掉落
        if (this.ball.isDropping) {
            // 只有在還沒settling時才執行掉落邏輯
            if (!this.ball.settling) {
                // 加速掉落
                this.ball.dropSpeed += 0.03;
                this.ball.radius -= this.ball.dropSpeed;
                
                // 檢查格子側邊碰撞（只在格子區域內）
                if (this.ball.radius > 158 && this.ball.radius < 207) {
                    this.checkSlotSideCollision();
                }
                
                // 觸底判斷：當球碰到錐形邊緣時停止掉落（考慮球的半徑）
                const ballSize = 8.6;
                const coneRadius = 158;
                if (this.ball.radius <= coneRadius + ballSize) {
                    this.ball.isDropping = false;
                    this.ball.radius = 166.6; // 固定在錐形邊緣外側
                    
                    // 大幅降低速度，確保能停下來
                    if (this.ball.speed > 0.01) {
                        this.ball.speed *= 0.15; // 反彈後速度變為原來的15%
                    } else {
                        this.ball.speed = 0; // 如果速度很小，直接設為0
                    }
                    
                    // 輕微改變方向，模擬彈跳效果
                    this.ball.angle += (Math.random() - 0.5) * 0.03;
                    
                    // 但不設置 settling = true，等速度歸零時再設置
                }
            }
        }
        
        // 只在球沒有進入settling狀態時才更新位置
        if (!this.ball.settling) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            this.ball.x = centerX + Math.cos(this.ball.angle) * this.ball.radius;
            this.ball.y = centerY + Math.sin(this.ball.angle) * this.ball.radius;
        }
    }
    
    determineFinalSlot() {        
        // 防止重複調用
        if (this.ball.finalSlot >= 0) {
            return;
        }
        
        const itemCount = this.items.length;
        if (itemCount === 0) {
            this.onSpinComplete();
            return;
        }
        
        // 計算球在哪個格子
        const anglePerItem = (2 * Math.PI) / itemCount;
        let relativeAngle = (this.ball.angle - this.currentRotation + Math.PI / 2) % (2 * Math.PI);
        
        // 確保角度為正數
        if (relativeAngle < 0) {
            relativeAngle += 2 * Math.PI;
        }
        
        const slotIndex = Math.floor(relativeAngle / anglePerItem) % itemCount;
        
        this.ball.finalSlot = slotIndex;
        
        // 清除舊的 timeout（如果有的話）
        if (this.resultTimeoutId) {
            clearTimeout(this.resultTimeoutId);
            this.resultTimeoutId = null;
        }
        
        // 立即顯示結果
        this.showXGunOnSlot(slotIndex);
        this.onSpinComplete();
    }
    
    showXGunOnSlot(slotIndex) {
        this.showXGun = true;
        this.xGunSlot = slotIndex;
    }
    
    checkSlotSideCollision() {
        const itemCount = this.items.length;
        if (itemCount === 0) return;
        
        const anglePerItem = (2 * Math.PI) / itemCount;
        const ballSize = 8.6; // 球的半徑
        
        // 計算球相對於輪盤的角度
        const relativeAngle = (this.ball.angle - this.currentRotation) % (2 * Math.PI);
        const adjustedAngle = (relativeAngle + 2 * Math.PI + Math.PI / 2) % (2 * Math.PI);
        
        // 找到球所在的格子
        const slotIndex = Math.floor(adjustedAngle / anglePerItem) % itemCount;
        const slotStartAngle = slotIndex * anglePerItem;
        
        // 計算球在格子內的相對角度（0是格子中心）
        const angleInSlot = adjustedAngle - slotStartAngle - (anglePerItem / 2);
        
        // 計算球邊緣佔據的角度範圍
        const ballAngularSize = ballSize / this.ball.radius;
        const maxAngleInSlot = (anglePerItem / 2) - ballAngularSize;
        
        // 如果球邊緣超出格子邊界
        if (Math.abs(angleInSlot) > maxAngleInSlot) {
            // 反彈：將球推回格子內
            const newAngleInSlot = maxAngleInSlot * Math.sign(angleInSlot);
            const newAdjustedAngle = slotStartAngle + (anglePerItem / 2) + newAngleInSlot;
            const newRelativeAngle = newAdjustedAngle - Math.PI / 2;
            this.ball.angle = (newRelativeAngle + this.currentRotation) % (2 * Math.PI);
            
            // 減少速度並稍微向外彈
            this.ball.speed *= 0.7;
            this.ball.radius += 1 + Math.random() * 2;
        }
    }
    
    drawBall() {
        this.ctx.save();
        
        // 繪製陰影
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
        
        // 繪製小球
        const ballSize = 8.6;  // 9.6 * 0.9
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, ballSize, 0, 2 * Math.PI);
        
        // 金屬質感漸變
        const gradient = this.ctx.createRadialGradient(
            this.ball.x - 2.9, this.ball.y - 2.9, 0,  // 高光位置也縮小0.9倍
            this.ball.x, this.ball.y, ballSize
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, '#e0e0e0');
        gradient.addColorStop(1, '#888888');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // 邊框
        this.ctx.strokeStyle = '#666';
        this.ctx.lineWidth = 0.5;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    updateBallWithWheel() {
        // 計算球相對於輪盤的固定角度
        if (this.ball.relativeAngle === undefined) {
            // 第一次計算，記錄球相對於輪盤的角度
            this.ball.relativeAngle = this.ball.angle - this.currentRotation;
        }
        
        // 根據輪盤的當前轉動更新球的角度
        this.ball.angle = this.ball.relativeAngle + this.currentRotation;
        
        // 更新球的位置
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.ball.x = centerX + Math.cos(this.ball.angle) * this.ball.radius;
        this.ball.y = centerY + Math.sin(this.ball.angle) * this.ball.radius;
    }
    
    drawWheel() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // 基礎半徑（縮小0.9倍）
        const baseNumberRadius = 252;  // 280 * 0.9
        const baseSlotRadius = 207;    // 230 * 0.9
        const baseConeRadius = 158;    // 175 * 0.9
        
        // 計算各層半徑
        const outerRadius = baseNumberRadius + this.trackWidth;  // 最外圍
        const rimInnerRadius = baseNumberRadius + this.innerTrackWidth;  // 外框內緣
        const numberRadius = baseNumberRadius;
        const slotRadius = baseSlotRadius;
        const coneRadius = baseConeRadius;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 清理測試代碼 - 移除基本測試圖形
        
        // 先繪製整個軌道區域（深咖啡色背景）
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
        this.ctx.arc(centerX, centerY, numberRadius, 0, 2 * Math.PI, true);
        this.ctx.fillStyle = '#8B4513';  // 深咖啡色
        this.ctx.fill();
        
        // 再繪製外框（淺咖啡色）
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
        this.ctx.arc(centerX, centerY, rimInnerRadius, 0, 2 * Math.PI, true);
        this.ctx.fillStyle = '#D2B48C';  // 淺咖啡色
        this.ctx.fill();
        
        const itemCount = this.items.length;
        if (itemCount === 0) {
            // 沒有項目時的顯示
            this.ctx.fillStyle = '#2c5f2d';
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, numberRadius, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('請輸入項目', centerX, centerY);
            
            // 繪製中心錐形
            this.drawCone(centerX, centerY, coneRadius);
            return;
        }
        
        const anglePerItem = (2 * Math.PI) / itemCount;
        
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.currentRotation);
        
        // 繪製格子區域（球會掉入的地方）
        for (let i = 0; i < itemCount; i++) {
            const startAngle = i * anglePerItem - Math.PI / 2;
            const endAngle = startAngle + anglePerItem;
            
            // 繪製格子（深色背景）
            this.ctx.beginPath();
            this.ctx.arc(0, 0, slotRadius, startAngle, endAngle);
            this.ctx.arc(0, 0, coneRadius, endAngle, startAngle, true);
            this.ctx.closePath();
            
            // 格子使用深色版本的顏色
            const baseColor = this.colors[i];
            let slotColor;
            if (baseColor === '#dc3545') { // 紅色
                slotColor = '#8b0000';
            } else if (baseColor === '#343a40') { // 黑色
                slotColor = '#1a1a1a';
            } else { // 綠色
                slotColor = '#004d26';
            }
            
            this.ctx.fillStyle = slotColor;
            this.ctx.fill();
            
            // 格子邊界
            this.ctx.strokeStyle = 'gold';
            this.ctx.lineWidth = 0.5;
            this.ctx.stroke();
            
            // 移除格子內的凹槽效果
        }
        
        // 移除重複的調試信息
        
        // 繪製數字環（在格子上方）
        for (let i = 0; i < itemCount; i++) {
            const startAngle = i * anglePerItem - Math.PI / 2;
            const endAngle = startAngle + anglePerItem;
            
            // 繪製數字環扇形
            this.ctx.beginPath();
            this.ctx.arc(0, 0, numberRadius, startAngle, endAngle);
            this.ctx.arc(0, 0, slotRadius, endAngle, startAngle, true);
            this.ctx.closePath();
            
            this.ctx.fillStyle = this.colors[i];
            this.ctx.fill();
            
            // 數字環邊界
            this.ctx.strokeStyle = '#ffd700';
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
            
            // 繪製文字
            this.ctx.save();
            this.ctx.rotate(startAngle + anglePerItem / 2);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 22px Arial';  // 字體縮小0.9倍（約）
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            
            const text = this.items[i];
            const textRadius = (numberRadius + slotRadius) / 2;
            
            // 調整字體大小以適應空間
            if (this.ctx.measureText(text).width > 40) {  // 45 * 0.9
                this.ctx.font = 'bold 16px Arial';  // 18 * 0.9
            }
            
            // 先畫數字文字
            this.ctx.fillText(text, textRadius, 0);
            
            
            // x_gun 圖片顯示
            if (this.showXGun && this.xGunSlot === i) {
                const gunSize = 40; // 適中的尺寸
                
                // 檢查圖片是否載入完成
                if (this.xGunImage.complete && this.xGunImage.width > 0) {
                    // 設置透明度
                    this.ctx.globalAlpha = 0.75; // 80% 不透明度
                    
                    // 保存當前狀態
                    this.ctx.save();
                    
                    // 移動到圖片要放置的位置
                    this.ctx.translate(textRadius, 0);
                    
                    // 順時針旋轉90度
                    this.ctx.rotate(Math.PI / 2);
                    
                    // 在(0,0)位置繪製圖片（已經移動到正確位置）
                    this.ctx.drawImage(
                        this.xGunImage, 
                        -gunSize/2,  // 水平置中
                        -gunSize/2,  // 垂直置中
                        gunSize, 
                        gunSize
                    );
                    
                    // 恢復狀態和透明度
                    this.ctx.restore();
                    this.ctx.globalAlpha = 1.0;
                } else {
                    // 後備方案：紅色方框
                    this.ctx.fillStyle = 'red';
                    this.ctx.fillRect(textRadius - 15, -15, 30, 30);
                    this.ctx.fillStyle = 'white';
                    this.ctx.font = 'bold 12px Arial';
                    this.ctx.fillText('X', textRadius, 0);
                }
            }
            
            this.ctx.restore();
        }
        
        // 繪製分隔線（從中心到外圈）
        for (let i = 0; i < itemCount; i++) {
            const angle = i * anglePerItem - Math.PI / 2;
            this.ctx.beginPath();
            this.ctx.moveTo(Math.cos(angle) * coneRadius, Math.sin(angle) * coneRadius);
            this.ctx.lineTo(Math.cos(angle) * numberRadius, Math.sin(angle) * numberRadius);
            this.ctx.strokeStyle = '#ffd700';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
        
        // 移除數字環外邊框
        
        // 繪製格子區域外邊框
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, slotRadius, 0, 2 * Math.PI);
        this.ctx.strokeStyle = '#8B7355';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // 繪製八等份分割線（只在內軌道深咖啡色部分）
        // 偏移 Math.PI/8 讓格子中心對齊12點鐘，而不是線對齊12點鐘
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8 + (Math.PI / 8);  // 偏移22.5度
            this.ctx.beginPath();
            this.ctx.moveTo(centerX + Math.cos(angle) * (numberRadius + 1), centerY + Math.sin(angle) * (numberRadius + 1));  // 只退1像素
            this.ctx.lineTo(centerX + Math.cos(angle) * rimInnerRadius, centerY + Math.sin(angle) * rimInnerRadius);
            this.ctx.strokeStyle = '#b8860b';  // 暗淡的金色
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
        
        // 繪製每個軌道格子中間的菱形（一正一橫交替）
        const trackCenterRadius = (numberRadius + rimInnerRadius) / 2;  // 軌道中央位置
        for (let i = 0; i < 8; i++) {
            const angle = (i * Math.PI * 2) / 8 - (Math.PI / 2);  // 第一個格子中心對齊12點鐘
            const centerX_diamond = centerX + Math.cos(angle) * trackCenterRadius;
            const centerY_diamond = centerY + Math.sin(angle) * trackCenterRadius;
            
            const diamondSize = 11;  // 菱形大小（12 * 0.9 約等於 11）
            const isVertical = i % 2 === 0;  // 奇數格子為正菱形，偶數格子為橫菱形
            
            // 橫菱形需要傳入角度來調整方向（沿著圓弧切線）
            this.drawDiamond(centerX_diamond, centerY_diamond, diamondSize, isVertical, angle);
        }
        
        // 繪製中心錐形（在變換之前，不跟著旋轉）
        this.drawConeBase(centerX, centerY, coneRadius);
        
        // 繪製會旋轉的中心圖片
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.currentRotation);
        this.drawRotatingCenterImage(coneRadius);
        this.ctx.restore();
    }
    
    drawDiamond(centerX, centerY, size, isVertical, angle = 0) {
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        
        if (!isVertical) {
            // 橫菱形需要根據弧度角度旋轉，讓長軸沿著圓弧切線方向
            // 切線方向是原角度 + 90度
            this.ctx.rotate(angle + Math.PI / 2);
        } else {
            // 正菱形也要根據角度旋轉，讓它指向圓心
            this.ctx.rotate(angle + Math.PI / 2);
        }
        
        this.ctx.beginPath();
        
        if (isVertical) {
            // 正菱形（徑向，指向圓心）
            this.ctx.moveTo(0, -size);          // 上
            this.ctx.lineTo(size/2, 0);         // 右
            this.ctx.lineTo(0, size);           // 下
            this.ctx.lineTo(-size/2, 0);        // 左
        } else {
            // 橫菱形（沿著圓弧切線）
            this.ctx.moveTo(-size, 0);          // 左
            this.ctx.lineTo(0, -size/2);        // 上
            this.ctx.lineTo(size, 0);           // 右
            this.ctx.lineTo(0, size/2);         // 下
        }
        
        this.ctx.closePath();
        this.ctx.fillStyle = '#ffd700';  // 金色填充
        this.ctx.fill();
        this.ctx.strokeStyle = '#b8860b';  // 暗金色邊框
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawConeBase(centerX, centerY, radius) {
        // 繪製錐形底座
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        const coneGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        coneGradient.addColorStop(0, '#d4a76a');
        coneGradient.addColorStop(0.7, '#b8956a');
        coneGradient.addColorStop(1, '#8b7355');
        this.ctx.fillStyle = coneGradient;
        this.ctx.fill();
        
        // 繪製錐形邊框
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    
    drawRotatingCenterImage(radius) {
        // 繪製會旋轉的 bull_bone 圖片
        if (this.bullBoneImage.complete && this.bullBoneImage.width > 0) {
            // 圖片大小設為錐形半徑的60%
            const imageSize = radius * 0.6 * 2; // 直徑
            this.ctx.drawImage(
                this.bullBoneImage,
                -imageSize/2,  // 水平置中（因為已經translate到中心）
                -imageSize/2,  // 垂直置中
                imageSize,
                imageSize
            );
        }
    }
    
    spin() {
        if (this.isSpinning || this.items.length === 0) return;
        
        // 清除可能存在的舊 timeout
        if (this.resultTimeoutId) {
            clearTimeout(this.resultTimeoutId);
            this.resultTimeoutId = null;
        }
        
        this.isSpinning = true;
        this.spinBtn.disabled = true;
        
        // 重置小球狀態
        this.ball.angle = Math.random() * Math.PI * 2;
        this.ball.radius = this.getBallTrackRadius();  // 在外圍軌道上
        this.ball.speed = -(0.12 + Math.random() * 0.04); // 初始速度為負值，逆時針旋轉
        this.ball.dropSpeed = 0;
        this.ball.isDropping = false;
        this.ball.settling = false;
        this.ball.finalSlot = -1;
        this.ball.relativeAngle = undefined;  // 清除相對角度
        
        // 重置 x_gun 顯示狀態
        this.showXGun = false;
        this.xGunSlot = -1;
        
        // 重置球的座標
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.ball.x = centerX + Math.cos(this.ball.angle) * this.ball.radius;
        this.ball.y = centerY + Math.sin(this.ball.angle) * this.ball.radius;
        
        // 輪盤維持原本的基礎轉動速度，不改變
    }
    
    onSpinComplete() {
        this.isSpinning = false;
        this.spinBtn.disabled = false;
        
        // 不再顯示彈窗，只在控制台顯示結果
        if (this.ball.finalSlot >= 0 && this.ball.finalSlot < this.items.length) {
            console.log('抽中了：', this.items[this.ball.finalSlot]);
        }
        
        // 不再重置小球到外圈，讓球停留在落定位置跟著輪盤轉動
    }
    
    showResult(item) {
        this.resultText.textContent = `抽中了：${item}`;
        this.modal.classList.add('show');
    }
    
    hideModal() {
        this.modal.classList.remove('show');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.roulette = new RouletteWheel();
});