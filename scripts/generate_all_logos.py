import os
import json
from PIL import Image

LIGHT_SRC = r"C:\Users\zer0\.gemini\antigravity-ide\brain\cf6715c1-11c6-4341-8bd3-f70173b96a27\.user_uploaded\media_1791012460671.png"
DARK_SRC = r"C:\Users\zer0\.gemini\antigravity-ide\brain\cf6715c1-11c6-4341-8bd3-f70173b96a27\.user_uploaded\media_1791012466873.png"

# Background color for dark theme icons
DARK_BG_COLOR = (11, 15, 25) # #0B0F19 - sleek deep obsidian
WHITE_BG_COLOR = (255, 255, 255) # Pure white

def create_solid_icon(src_img_path, bg_color, size=(1024, 1024)):
    """Create a solid background app icon (required by Apple App Store and standard Android launcher)."""
    src = Image.open(src_img_path).convert("RGBA")
    if src.size != size:
        src = src.resize(size, Image.Resampling.LANCZOS)
    
    # Solid background
    bg = Image.new("RGBA", size, (*bg_color, 255))
    bg.alpha_composite(src)
    return bg.convert("RGB")

def create_transparent_icon(src_img_path, size):
    """Resize transparent icon using high quality Lanczos resampling."""
    src = Image.open(src_img_path).convert("RGBA")
    if src.size != size:
        return src.resize(size, Image.Resampling.LANCZOS)
    return src

def main():
    print("Generating Sport+ logo assets across entire project...")
    
    # Base images
    img_light_1024 = Image.open(LIGHT_SRC).convert("RGBA")
    img_dark_1024 = Image.open(DARK_SRC).convert("RGBA")
    
    # App Icons (Solid RGB)
    app_icon_dark = create_solid_icon(DARK_SRC, DARK_BG_COLOR, (1024, 1024))
    app_icon_light = create_solid_icon(LIGHT_SRC, WHITE_BG_COLOR, (1024, 1024))

    # =========================================================================
    # 1. CRM: admin-web/public/
    # =========================================================================
    crm_public = r"e:\git_hub\ielts\SPORT-\admin-web\public"
    os.makedirs(crm_public, exist_ok=True)
    
    img_dark_1024.save(os.path.join(crm_public, "logo-dark.png"), "PNG")
    img_light_1024.save(os.path.join(crm_public, "logo-light.png"), "PNG")
    # Default logo for dark sidebar
    img_dark_1024.resize((256, 256), Image.Resampling.LANCZOS).save(os.path.join(crm_public, "logo.png"), "PNG")
    
    # Favicons
    fav_32 = img_dark_1024.resize((32, 32), Image.Resampling.LANCZOS)
    fav_48 = img_dark_1024.resize((48, 48), Image.Resampling.LANCZOS)
    fav_192 = img_dark_1024.resize((192, 192), Image.Resampling.LANCZOS)
    fav_512 = img_dark_1024.resize((512, 512), Image.Resampling.LANCZOS)
    fav_32.save(os.path.join(crm_public, "favicon-32x32.png"), "PNG")
    fav_48.save(os.path.join(crm_public, "favicon.png"), "PNG")
    fav_192.save(os.path.join(crm_public, "favicon-192.png"), "PNG")
    fav_512.save(os.path.join(crm_public, "favicon-512.png"), "PNG")
    
    # Apple touch icon (180x180 solid)
    app_icon_dark.resize((180, 180), Image.Resampling.LANCZOS).save(os.path.join(crm_public, "apple-touch-icon.png"), "PNG")
    
    # Save .ico multi-size
    fav_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    ico_imgs = [img_dark_1024.resize(s, Image.Resampling.LANCZOS) for s in fav_sizes]
    ico_imgs[0].save(os.path.join(crm_public, "favicon.ico"), format="ICO", sizes=fav_sizes)
    print("[OK] admin-web/public assets created")

    # =========================================================================
    # 2. CRM: admin/ (Static Admin)
    # =========================================================================
    admin_static_assets = r"e:\git_hub\ielts\SPORT-\admin\assets"
    os.makedirs(admin_static_assets, exist_ok=True)
    img_dark_1024.save(os.path.join(admin_static_assets, "logo-dark.png"), "PNG")
    img_light_1024.save(os.path.join(admin_static_assets, "logo-light.png"), "PNG")
    fav_48.save(os.path.join(admin_static_assets, "favicon.png"), "PNG")
    print("[OK] admin/assets created")

    # =========================================================================
    # 3. Backend & Telegram Bot: backend/assets/
    # =========================================================================
    backend_assets = r"e:\git_hub\ielts\SPORT-\backend\assets"
    os.makedirs(backend_assets, exist_ok=True)
    img_dark_1024.save(os.path.join(backend_assets, "logo_dark.png"), "PNG")
    img_light_1024.save(os.path.join(backend_assets, "logo_light.png"), "PNG")
    
    # Bot Profile Avatars (Ideal standard square for Telegram Bot profile: 512x512 & 1024x1024)
    app_icon_dark.save(os.path.join(backend_assets, "telegram_bot_avatar_dark.png"), "PNG")
    app_icon_dark.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(backend_assets, "telegram_bot_avatar_512.png"), "PNG")
    app_icon_light.save(os.path.join(backend_assets, "telegram_bot_avatar_light.png"), "PNG")
    print("[OK] backend/assets created")

    # =========================================================================
    # 4. Mobile (React Native / Expo): mobile/assets/
    # =========================================================================
    mobile_assets = r"e:\git_hub\ielts\SPORT-\mobile\assets"
    os.makedirs(mobile_assets, exist_ok=True)
    
    # icon.png (1024x1024 solid dark background)
    app_icon_dark.save(os.path.join(mobile_assets, "icon.png"), "PNG")
    
    # android-icon-foreground.png (512x512 & 1024x1024 transparent white logo)
    img_dark_1024.save(os.path.join(mobile_assets, "android-icon-foreground.png"), "PNG")
    
    # android-icon-background.png (1024x1024 solid #0B0F19)
    bg_img = Image.new("RGBA", (1024, 1024), (*DARK_BG_COLOR, 255))
    bg_img.save(os.path.join(mobile_assets, "android-icon-background.png"), "PNG")
    
    # android-icon-monochrome.png (transparent white silhouette)
    img_dark_1024.resize((432, 432), Image.Resampling.LANCZOS).save(os.path.join(mobile_assets, "android-icon-monochrome.png"), "PNG")
    
    # splash-icon.png (512x512 transparent)
    img_dark_1024.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(mobile_assets, "splash-icon.png"), "PNG")
    
    # favicon.png
    fav_48.save(os.path.join(mobile_assets, "favicon.png"), "PNG")
    
    # In-app brand logos
    img_light_1024.save(os.path.join(mobile_assets, "logo-light.png"), "PNG")
    img_dark_1024.save(os.path.join(mobile_assets, "logo-dark.png"), "PNG")
    print("[OK] mobile/assets updated")

    # =========================================================================
    # 5. Flutter: android/sport_plus_android/
    # =========================================================================
    flutter_assets = r"e:\git_hub\ielts\SPORT-\android\sport_plus_android\assets\images"
    os.makedirs(flutter_assets, exist_ok=True)
    img_light_1024.save(os.path.join(flutter_assets, "logo_light.png"), "PNG")
    img_dark_1024.save(os.path.join(flutter_assets, "logo_dark.png"), "PNG")
    app_icon_dark.save(os.path.join(flutter_assets, "app_icon.png"), "PNG")
    
    # Android mipmaps for Flutter launcher
    res_base = r"e:\git_hub\ielts\SPORT-\android\sport_plus_android\android\app\src\main\res"
    mipmap_sizes = {
        "mipmap-mdpi": (48, 48),
        "mipmap-hdpi": (72, 72),
        "mipmap-xhdpi": (96, 96),
        "mipmap-xxhdpi": (144, 144),
        "mipmap-xxxhdpi": (192, 192),
    }
    for folder, size in mipmap_sizes.items():
        folder_path = os.path.join(res_base, folder)
        os.makedirs(folder_path, exist_ok=True)
        icon_resized = app_icon_dark.resize(size, Image.Resampling.LANCZOS)
        icon_resized.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")
        icon_resized.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")
    print("[OK] Flutter & Android mipmap assets created")

    # =========================================================================
    # 6. iOS: ios/SportPlus/Assets.xcassets/
    # =========================================================================
    xcassets = r"e:\git_hub\ielts\SPORT-\ios\SportPlus\Assets.xcassets"
    appiconset = os.path.join(xcassets, "AppIcon.appiconset")
    os.makedirs(appiconset, exist_ok=True)
    
    # iOS AppIcon.appiconset standard sizes
    # Notice: iOS 1024x1024 MUST NOT have alpha transparency!
    app_icon_dark.save(os.path.join(appiconset, "AppIcon-1024.png"), "PNG")
    
    ios_sizes = [
        ("AppIcon-180.png", (180, 180)), # iPhone 60@3x
        ("AppIcon-120.png", (120, 120)), # iPhone 60@2x
        ("AppIcon-87.png", (87, 87)),   # iPhone Settings 29@3x
        ("AppIcon-58.png", (58, 58)),   # iPhone Settings 29@2x
        ("AppIcon-80.png", (80, 80)),   # iPhone Spotlight 40@2x
        ("AppIcon-120-spotlight.png", (120, 120)), # iPhone Spotlight 40@3x
        ("AppIcon-40.png", (40, 40)),   # Notification 20@2x
        ("AppIcon-60.png", (60, 60)),   # Notification 20@3x
        ("AppIcon-167.png", (167, 167)), # iPad Pro 83.5@2x
        ("AppIcon-152.png", (152, 152)), # iPad 76@2x
        ("AppIcon-76.png", (76, 76)),   # iPad 76@1x
    ]
    for filename, sz in ios_sizes:
        app_icon_dark.resize(sz, Image.Resampling.LANCZOS).save(os.path.join(appiconset, filename), "PNG")
        
    appicon_json = {
        "images": [
            {"filename": "AppIcon-1024.png", "idiom": "universal", "platform": "ios", "size": "1024x1024"},
            {"filename": "AppIcon-40.png", "idiom": "iphone", "scale": "2x", "size": "20x20"},
            {"filename": "AppIcon-60.png", "idiom": "iphone", "scale": "3x", "size": "20x20"},
            {"filename": "AppIcon-58.png", "idiom": "iphone", "scale": "2x", "size": "29x29"},
            {"filename": "AppIcon-87.png", "idiom": "iphone", "scale": "3x", "size": "29x29"},
            {"filename": "AppIcon-80.png", "idiom": "iphone", "scale": "2x", "size": "40x40"},
            {"filename": "AppIcon-120-spotlight.png", "idiom": "iphone", "scale": "3x", "size": "40x40"},
            {"filename": "AppIcon-120.png", "idiom": "iphone", "scale": "2x", "size": "60x60"},
            {"filename": "AppIcon-180.png", "idiom": "iphone", "scale": "3x", "size": "60x60"},
            {"filename": "AppIcon-76.png", "idiom": "ipad", "scale": "1x", "size": "76x76"},
            {"filename": "AppIcon-152.png", "idiom": "ipad", "scale": "2x", "size": "76x76"},
            {"filename": "AppIcon-167.png", "idiom": "ipad", "scale": "2x", "size": "83.5x83.5"}
        ],
        "info": {
            "author": "xcode",
            "version": 1
        }
    }
    with open(os.path.join(appiconset, "Contents.json"), "w", encoding="utf-8") as f:
        json.dump(appicon_json, f, indent=2)
        
    # LogoDark.imageset (white logo for dark UI in iOS)
    logodark_set = os.path.join(xcassets, "LogoDark.imageset")
    os.makedirs(logodark_set, exist_ok=True)
    img_dark_1024.resize((120, 120), Image.Resampling.LANCZOS).save(os.path.join(logodark_set, "logo_dark_1x.png"), "PNG")
    img_dark_1024.resize((240, 240), Image.Resampling.LANCZOS).save(os.path.join(logodark_set, "logo_dark_2x.png"), "PNG")
    img_dark_1024.resize((360, 360), Image.Resampling.LANCZOS).save(os.path.join(logodark_set, "logo_dark_3x.png"), "PNG")
    logodark_json = {
        "images": [
            {"filename": "logo_dark_1x.png", "idiom": "universal", "scale": "1x"},
            {"filename": "logo_dark_2x.png", "idiom": "universal", "scale": "2x"},
            {"filename": "logo_dark_3x.png", "idiom": "universal", "scale": "3x"}
        ],
        "info": {"author": "xcode", "version": 1}
    }
    with open(os.path.join(logodark_set, "Contents.json"), "w", encoding="utf-8") as f:
        json.dump(logodark_json, f, indent=2)

    # LogoLight.imageset (black logo for light UI in iOS)
    logolight_set = os.path.join(xcassets, "LogoLight.imageset")
    os.makedirs(logolight_set, exist_ok=True)
    img_light_1024.resize((120, 120), Image.Resampling.LANCZOS).save(os.path.join(logolight_set, "logo_light_1x.png"), "PNG")
    img_light_1024.resize((240, 240), Image.Resampling.LANCZOS).save(os.path.join(logolight_set, "logo_light_2x.png"), "PNG")
    img_light_1024.resize((360, 360), Image.Resampling.LANCZOS).save(os.path.join(logolight_set, "logo_light_3x.png"), "PNG")
    logolight_json = {
        "images": [
            {"filename": "logo_light_1x.png", "idiom": "universal", "scale": "1x"},
            {"filename": "logo_light_2x.png", "idiom": "universal", "scale": "2x"},
            {"filename": "logo_light_3x.png", "idiom": "universal", "scale": "3x"}
        ],
        "info": {"author": "xcode", "version": 1}
    }
    with open(os.path.join(logolight_set, "Contents.json"), "w", encoding="utf-8") as f:
        json.dump(logolight_json, f, indent=2)
        
    print("[OK] iOS Assets.xcassets created")
    print("ALL LOGO ASSETS SUCCESSFULLY GENERATED!")

if __name__ == "__main__":
    main()
