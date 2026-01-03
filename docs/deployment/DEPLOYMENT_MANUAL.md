# Manual Deployment Guide for cortexbuildpro.com

## Connection Details
- **IP**: 82.29.188.65
- **Port**: 65002
- **Username**: u875310796
- **Target Directory**: `/home/u875310796/domains/cortexbuildpro.com/public_html`

## Option 1: Hostinger File Manager (Recommended)

1. Log in to Hostinger hPanel: https://hpanel.hostinger.com
2. Navigate to: **Files** → **File Manager**
3. Navigate to: `/domains/cortexbuildpro.com/public_html`
4. Delete all existing files in this directory (backup first if needed)
5. Upload all files from your local `dist/` folder
6. Ensure the `.htaccess` file is uploaded (it may be hidden)

## Option 2: FTP Client (FileZilla)

1. Download FileZilla: https://filezilla-project.org/
2. Create a new connection:
   - **Host**: sftp://82.29.188.65
   - **Port**: 65002
   - **Protocol**: SFTP
   - **Username**: u875310796
   - **Password**: [Your Hostinger password]
3. Connect and navigate to `/domains/cortexbuildpro.com/public_html`
4. Upload all files from the `dist/` folder

## Option 3: Command Line (if password works)

```bash
# Using SCP
scp -P 65002 -r dist/* u875310796@82.29.188.65:/home/u875310796/domains/cortexbuildpro.com/public_html/

# Or using rsync
rsync -avz -e "ssh -p 65002" dist/ u875310796@82.29.188.65:/home/u875310796/domains/cortexbuildpro.com/public_html/
```

## Files to Upload

The `dist/` folder contains:
- `index.html` - Main entry point
- `.htaccess` - Server configuration (IMPORTANT!)
- `assets/` - All CSS, JS, and other assets
- `manifest.webmanifest` - PWA manifest
- Other static files

## Verification

After deployment, verify:
1. Visit: https://cortexbuildpro.com
2. Check that the site loads correctly
3. Test the API connection: https://cortexbuildpro.com/api/health

## Troubleshooting

If you see a blank page:
- Check that `.htaccess` was uploaded
- Verify file permissions (644 for files, 755 for directories)
- Check browser console for errors

If API requests fail:
- Verify the backend is running
- Check that the `.htaccess` API exclusion rule is in place
