package com.b12powered.area.api

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.android.volley.Request

sealed class ApiRoute(var mainContext: Context) {

    data class Login(var email: String, var password: String, var context: Context) : ApiRoute(context)
    data class Register(var email: String, var password: String, var redirectUrl: String, var context: Context) : ApiRoute(context)
    data class OAuth2(var service: String, var redirectUrl: String, var context: Context) : ApiRoute(context)
    data class DataCode(var code: String, var context: Context) : ApiRoute(context)
    data class Validate(var token: String, var context: Context) : ApiRoute(context)
    data class ReadinessProbe(var context: Context) : ApiRoute(context)

    val timeout: Int
        get() {
            return 3000
        }

    private val baseUrl: String
        get() {
            val sharedPreferences = mainContext.getSharedPreferences("com.b12powered.area", Context.MODE_PRIVATE)
            return if (sharedPreferences.contains("api_url")) {
                    sharedPreferences.getString("api_url", null)!!
                } else {
                    System.getenv("API_HOST") ?: "https://dev.api.area.b12powered.com"
                }
        }

    val url: String
        get() {
            return "$baseUrl/${when (this@ApiRoute) {
                is Login -> "users/login"
                is Register -> "users/register"
                is OAuth2 -> "users/serviceLogin/${service}"
                is DataCode -> "data-code/${code}"
                is Validate -> "users/validate"
                is ReadinessProbe -> "readinessProbe"
                else -> ""
            }}"
        }

    val httpMethod: Int
        get() {
            return when (this) {
                is Login -> Request.Method.POST
                is Register -> Request.Method.POST
                is Validate -> Request.Method.PATCH
                is ReadinessProbe -> Request.Method.GET
                else -> Request.Method.GET
            }
        }

    val body: HashMap<String, String>
        get() {
            return when (this) {
                is Login -> {
                    hashMapOf(Pair("email", email), Pair("password", password))
                }
                is Register -> {
                    hashMapOf(Pair("email", email), Pair("password", password))
                }
                else -> hashMapOf()
            }
        }

    val params: HashMap<String, String>
        get() {
            return when (this) {
                is Register -> {
                    hashMapOf(Pair("redirectURL", redirectUrl))
                }
                is OAuth2 -> {
                    hashMapOf(Pair("redirectURL", redirectUrl))
                }
                is Validate -> {
                    hashMapOf(Pair("token", token))
                }
                else -> hashMapOf()
            }
        }

    val headers: HashMap<String, String>
        get() {
            val map: HashMap<String, String> = hashMapOf()
            map["Accept"] = "application/json"
            return when (this) {
                else -> hashMapOf()
            }
        }
}