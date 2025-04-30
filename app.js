// app.js - main angular appplication with routing
var app = angular.module("myApp", ["ngRoute"]);

// configure the routes
app.config(function ($routeProvider) {

  // check if user is authenticated
  function checkAuth($location, AuthService){
    if(AuthService.isAuthenticated()){
      return true;
    } else{
      $location.path("/login");
      return false;
    }
  }

  // redirect user if authenticated
  function redirectIfAuthenticated($location, AuthService){
    if(AuthService.isAuthenticated()){
      $location.path("/content");
      return false;
    }
    return true;
  }

  $routeProvider
    // login route
    .when("/login", {
      templateUrl: "templates/login.html",
      controller: "LoginController",
      resolve:{auth: redirectIfAuthenticated}
    })
    // registration route
    .when("/register", {
      templateUrl: "templates/register.html",
      controller: "RegisterController",
      resolve: {auth : redirectIfAuthenticated}
    })
    .when("/verify-otp", {
      templateUrl: "templates/verify-otp.html",
      controller: 'VerifyOtpController',
      resolve: {auth: redirectIfAuthenticated}
    })
    .when("/complete-profile", {
      templateUrl: "templates/complete_profile.html",
      controller: 'CompleteProfileController',
      resolve: {auth: redirectIfAuthenticated}
    })
    // employer route
    .when("/employerRegister", {
      templateUrl: "templates/employerRegister.html",
      controller: "EmployerRegisterController",
      resolve: {auth: redirectIfAuthenticated}
    })
    // main content route (protected)
    .when("/content", {
      templateUrl: "templates/content.html",
      controller: "ContentController",
      resolve: {auth: checkAuth}
    })
    // Profile route
    .when("/profile", {
      templateUrl: "templates/profile.html",
      controller: "ProfileController",
      resolve: {auth: checkAuth}
    })
    // default routes redirect to login
    .otherwise({
      redirectTo: "/login",
    });
});

// Authentication service
// Authentication service
app.factory("AuthService", function ($http) {
  var auth = {
    user: null,

    // check if user is authenticated
    isAuthenticated: function () {
      // check local storage for auth token
      return localStorage.getItem("authToken") !== null;
    },
    
    //login method - communicates with php backend
    login: function (credentials) {
      return $http.post("login.php", credentials).then(function (response) {
        if (response.data.success) {
          // store auth token in localstorage
          localStorage.setItem("authToken", response.data.token);
          auth.user = response.data.user;
          return true;
        } else {
          return false;
        }
      });
    },

    // logout method
    logout: function () {
      return $http.post("logout.php").then(function () {
        // clear localstorage and user data
        localStorage.removeItem("authToken");
        auth.user = null;
      });
    },

    // Initial registration (email only)
    register: function (userData) {
      return $http.post("register.php", userData);
    },

    // Verify OTP
    verifyOtp: function(verificationData) {
      return $http.post("verify_otp.php", verificationData);
    },
    
    // Resend OTP
    resendOtp: function(email) {
      return $http.post("resend_otp.php", { email: email });
    },
    
    // Complete profile
    completeProfile: function(userData) {
      return $http.post("complete_profile.php", userData);
    },

    // Employer registration
    employerRegister: function (userData){
      return $http.post("employerRegister.php", userData);
    }
  };

  // check for existing token on startup
  if (auth.isAuthenticated()) {
    $http.post("check_auth.php").then(function (response) {
      if (response.data.success) {
        auth.user = response.data.user;
      } else {
        localStorage.removeItem("authToken");
      }
    });
  }

  return auth;
});
//Login controlerr
app.controller("LoginController", function ($scope, $location, AuthService) {
  $scope.credentials = {
    username: "",
    password: "",
  };

  $scope.errorMessage = "";

  $scope.login = function () {
    AuthService.login($scope.credentials)
      .then(function (success) {
        if (success) {
          $location.path("/content");
        } else {
          $scope.errorMessage = "Invalid username or password";
        }
      })
      .catch(function () {
        $scope.errorMessage = "Server error occured";
      });
  };

  $scope.showPassword = false;

  $scope.goToRegister = function () {
    $location.path("/register");
  };

  $scope.goToEmployerRegister = function(){
    $location.path("/employerRegister");
  }
});

// Registration Controller
app.controller("RegisterController", function ($scope, $location, AuthService) {
  $scope.userData = {
    email: ""
  };

  $scope.errorMessage = "";
  $scope.successMessage = "";

  $scope.register = function () {
    if (!$scope.userData.email) {
      $scope.errorMessage = "Email is required";
      return;
    }
    // send registration request to PHP server
    AuthService.register($scope.userData)
      .then(function (response) {
        if (response.data.success) {
          $scope.successMessage = "OTP sent to your email successfully!";
          $scope.errorMessage = "";
          
          // Save email in session storage for verification step
          sessionStorage.setItem("pendingEmail", $scope.userData.email);

          if(response.data.test_otp){
            sessionStorage.setItem("testOTP", response.data.test_otp);
          }
          
          // Redirect to OTP verification page after 1.5 seconds
          setTimeout(function () {
            $scope.$apply(function () {
              $location.path("/verify-otp");
            });
          }, 1500);
        } else {
          $scope.errorMessage = response.data.message || "Registration Failed";
          $scope.successMessage = "";
        }
      })
      .catch(function (error) {
        console.error("Registration error:", error);
        $scope.errorMessage = "Server error occurred. Please try again later.";
        $scope.successMessage = "";
      });
  };

  $scope.goToLogin = function () {
    $location.path("/login");
  };
});

// OTP Verification Controller
app.controller("VerifyOtpController", function ($scope, $location, $http) {
  $scope.verificationData = {
    email: sessionStorage.getItem("pendingEmail") || sessionStorage.getItem("verifiedEmail") ||  "",
    otp: ""
  };

  $scope.errorMessage = "";
  $scope.successMessage = "";

  $scope.tesOtp = sessionStorage.getItem("testOTP") || ""
  
  // If no pending email, redirect to registration
  if (!$scope.verificationData.email) {
    $location.path("/register");
  }

  $scope.verifyOtp = function () {
    if (!$scope.verificationData.otp) {
      $scope.errorMessage = "Please enter the OTP";
      return;
    }
    
    $http.post("verify_otp.php", $scope.verificationData)
      .then(function (response) {
        if (response.data.success) {
          $scope.successMessage = "Email verified successfully!";
          $scope.errorMessage = "";
          
          // Clear the pending email
          sessionStorage.removeItem("pendingEmail");
          sessionStorage.removeItem("testOTP");
          sessionStorage.setItem("verifiedEmail", $scope.verificationData.email);
          
          // Redirect to complete profile page
          setTimeout(function () {
            $scope.$apply(function () {
              $location.path("/complete-profile");
            });
          }, 1500);
        } else {
          $scope.errorMessage = response.data.message || "Verification Failed";
          $scope.successMessage = "";
        }
      })
      .catch(function (error) {
        console.error("Verification error:", error);
        $scope.errorMessage = "Server error occurred. Please try again later.";
        $scope.successMessage = "";
      });
  };

  $scope.resendOtp = function() {
    $http.post("resend_otp.php", {email: $scope.verificationData.email})
      .then(function(response) {
        if (response.data.success) {
          $scope.successMessage = "New OTP sent successfully!";
          $scope.errorMessage = "";

          // save test OTP for display
          if(response.data.test_otp){
            sessionStorage.setItem("testOTP", response.data.test_otp);
            $scope.tesOtp = response.data.test_otp;
          }

        } else {
          $scope.errorMessage = response.data.message || "Failed to resend OTP";
          $scope.successMessage = "";
        }
      })
      .catch(function(error) {
        console.error("Resend OTP error:", error);
        $scope.errorMessage = "Server error occurred. Please try again later.";
        $scope.successMessage = "";
      });
  };

  $scope.goBack = function() {
    $location.path("/register");
  };
});

// Complete Profile Controller
app.controller("CompleteProfileController", function ($scope, $location, $http, AuthService) {
  $scope.userData = {
    email: sessionStorage.getItem("verifiedEmail") || "",
    username: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    bio: ""
  };

  $scope.errorMessage = "";
  $scope.successMessage = "";
  
  // If no verified email, redirect to registration
  if (!$scope.userData.email) {
    $location.path("/register");
    $scope.errorMessage = "Please Register First";
  }

  $scope.completeProfile = function () {
    // Validate password match
    if ($scope.userData.password !== $scope.userData.confirmPassword) {
      $scope.errorMessage = "Passwords do not match";
      return;
    }
    
    $http.post("complete_profile.php", $scope.userData)
      .then(function (response) {
        if (response.data.success) {
          $scope.successMessage = "Profile completed successfully!";
          $scope.errorMessage = "";
          
          // Clear the verified email
          sessionStorage.removeItem("verifiedEmail");
          
          // Redirect to login page
          setTimeout(function () {
            $scope.$apply(function () {
              $location.path("/login");
            });
          }, 1500);
        } else {
          $scope.errorMessage = response.data.message || "Profile Update Failed";
          $scope.successMessage = "";
        }
      })
      .catch(function (error) {
        console.error("Profile completion error:", error);
        $scope.errorMessage = "Server error occurred. Please try again later.";
        $scope.successMessage = "";
      });
  };
});
//Content controller
app.controller("ContentController", function ($scope, $location, $http, AuthService) {
  
  $scope.profile = {}; // store the user profile

  $http.get("profile.php").then(function (response){
    if(response.data.success){
      $scope.profile = response.data.profile;
    }
  });

  $scope.viewProfile = function () {
    $location.path("/profile");
  };

  $scope.logout = function () {
    AuthService.logout().then(function () {
      $location.path("/login");
    });
  };
});

//Profile controller
app.controller(
  "ProfileController",
  function ($scope, $location, $http, AuthService) {
    $scope.profile = {};

    // fetch profile data from server
    $http.get("profile.php").then(function (response) {
      if (response.data.success) {
        $scope.profile = response.data.profile;
      }
    });

    $scope.backToContent = function () {
      $location.path("/content");
    };

    $scope.logout = function () {
      AuthService.logout().then(function () {
        $location.path("/login");
      });
    };
  }
);

// HTTP Interceptor to add auth token to all requests
app.factory("AuthInterceptor", function () {
  return {
    request: function (config) {
      const token = localStorage.getItem("authToken");
      if (token) {
        config.headers["Authorization"] = "Bearer " + token;
      }
      return config;
    },
  };
});

//Registter interceptor
app.config(function ($httpProvider) {
  $httpProvider.interceptors.push("AuthInterceptor");
});
