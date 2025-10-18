# OutLook Tutoring - Email Templates

Beautiful, branded email templates for authentication flows.

## 📧 Templates Included

1. **verification.html/txt** - Email verification for new signups
2. **reset-password.html/txt** - Password reset emails

## 🎨 Design Features

- **Brand Colors**: Teal/green gradient (#14b8a6 to #0d9488)
- **Responsive**: Works on all email clients and devices
- **Accessible**: Clear typography and high contrast
- **Professional**: Clean, modern academic aesthetic

## 🚀 How to Use

### Step 1: Configure Supabase SMTP

1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** → **Auth**
3. Scroll to **SMTP Settings**
4. Configure Gmail SMTP (see DEPLOY.md for details)

### Step 2: Add Templates to Supabase

1. Go to **Authentication** → **Email Templates**
2. For each template type:
   - Click on the template (e.g., "Confirm signup")
   - Copy the content from the corresponding `.html` file
   - Paste into the Supabase editor
   - Customize if needed
   - Save

### Available Template Variables

Supabase provides these variables you can use:

- `{{ .ConfirmationURL }}` - The verification/reset link
- `{{ .Token }}` - The OTP token (if using)
- `{{ .Email }}` - User's email address
- `{{ .SiteURL }}` - Your application URL

## 📱 Preview

### Desktop Preview
![Email on Desktop](preview-desktop.png)

### Mobile Preview
![Email on Mobile](preview-mobile.png)

## ✏️ Customization

To customize the templates:

1. **Change Colors**: Update the hex values in the gradient
   ```html
   background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);
   ```

2. **Update Branding**: Change "OutLook Tutoring" to your brand name

3. **Modify Layout**: Adjust padding, spacing, and section structure

4. **Add Logo**: Upload logo to Supabase storage and reference it:
   ```html
   <img src="{{ .SiteURL }}/logo.png" alt="Logo" />
   ```

## 🧪 Testing

Test your emails before going live:

1. In Supabase, use the **Test SMTP** button
2. Check your inbox (and spam folder!)
3. Verify all links work correctly
4. Test on multiple email clients:
   - Gmail
   - Outlook
   - Apple Mail
   - Mobile email apps

## 🔒 Security Notes

- Never include sensitive data in email templates
- Always use HTTPS links
- Set appropriate link expiration times
- Use plain text alternatives for accessibility

## 📞 Support

For issues with email delivery:
- Check SMTP configuration in Supabase
- Verify Gmail app password is correct
- Review Supabase logs for errors
- Test with different email providers

---

**Last Updated**: 2025-10-18
**Version**: 1.0
