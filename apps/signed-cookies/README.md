# About

This example uses a simple password to protect a members only area.
 
 When the user provides the correct password, a signed cookie is set to indicate that the user is authenticated.

## Home Page

Navigate to `http://localhost:3000/`

You will see links to:

 * A Login Page
 * A Members Area (protected)
 * A Logout Page

## Login

When you navigate to `http://localhost:3000/login` you will see a Form.

The form only requires providing a password.

On form submission the password is compared to a pre-computed hash.

If the hashes match, the server sets a signed cookie.

## Members Area

The members area checks for the presecence of this cookie.

If set, you can view the contents of `http://localhost:3000/members`

Otherwise you get redirected to login.