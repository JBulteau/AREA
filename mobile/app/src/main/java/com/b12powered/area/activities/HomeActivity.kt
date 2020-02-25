package com.b12powered.area.activities

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.b12powered.area.R
import com.b12powered.area.User
import com.b12powered.area.api.ApiClient
import com.b12powered.area.toObject

/**
 * The activity where the user can have all services
 *
 * This class show the home page of the user connected
 */
class HomeActivity : AppCompatActivity() {

    private var currentUser: User? = null

    /**
     * Override method onCreate
     *
     * Perform an api call on /me to get current user. If the call failed, redirect to Login Page
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)

        val data: Uri? = intent?.data

        if (data !== null) {
            val code: String? = data.getQueryParameter("code")
            if (code !== null) {
                ApiClient(this)
                    .dataCode(code) { user, message ->
                        if (user !== null) {
                            val sharedPreferences = getSharedPreferences("com.b12powered.area", Context.MODE_PRIVATE)
                            val editor = sharedPreferences.edit()

                            editor.putString("jwt-token", user.toObject<User>().token)
                            editor.apply()
                            checkTokenValidity()
                        } else {
                            Toast.makeText(
                                this,
                                message,
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                    }
            }
        } else {
            checkTokenValidity()
        }

    }

    private fun checkTokenValidity() {

        ApiClient(this)
            .getUser { user, message ->
                if (user != null) {
                    currentUser = user
                } else {
                    Toast.makeText(
                        this,
                        message,
                        Toast.LENGTH_SHORT
                    ).show()
                    val intent = Intent(this, LoginActivity::class.java)
                    finish()
                    startActivity(intent)
                }
            }
    }

}
