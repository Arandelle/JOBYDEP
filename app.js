// app.js - main angular appplication with routing
var app = angular.module("myApp", ["ngRoute"]);

// configure the routes
app.config(function ($routeProvider) {
  // check if user is authenticated
  function checkAuth($location, AuthService) {
    if (AuthService.isAuthenticated()) {
      return true;
    } else {
      $location.path("/login");
      return false;
    }
  }

  // redirect user if authenticated
  function redirectIfAuthenticated($location, AuthService) {
    if (AuthService.isAuthenticated()) {
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
      resolve: { auth: redirectIfAuthenticated },
    })
    // registration route
    .when("/register", {
      templateUrl: "templates/register.html",
      controller: "RegisterController",
      resolve: { auth: redirectIfAuthenticated },
    })
    .when("/verify-otp", {
      templateUrl: "templates/verify-otp.html",
      controller: "VerifyOtpController",
      resolve: { auth: redirectIfAuthenticated },
    })
    .when("/complete-profile", {
      templateUrl: "templates/complete_profile.html",
      controller: "CompleteProfileController",
      resolve: { auth: redirectIfAuthenticated },
    })
    // employer route
    .when("/employerRegister", {
      templateUrl: "templates/employerRegister.html",
      controller: "EmployerRegisterController",
      resolve: { auth: redirectIfAuthenticated },
    })
    // main content route (protected)
    .when("/content", {
      templateUrl: "templates/content.html",
      controller: "ContentController",
      resolve: { auth: checkAuth },
    })
    // Profile route
    .when("/profile", {
      templateUrl: "templates/profile.html",
      controller: "ProfileController",
      resolve: { auth: checkAuth },
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
    verifyOtp: function (verificationData) {
      return $http.post("verify_otp.php", verificationData);
    },

    // Resend OTP
    resendOtp: function (email) {
      return $http.post("resend_otp.php", { email: email });
    },

    // Complete profile
    completeProfile: function (userData) {
      return $http.post("complete_profile.php", userData);
    },

    // Employer registration
    employerRegister: function (userData) {
      return $http.post("employerRegister.php", userData);
    },
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

  $scope.goToEmployerRegister = function () {
    $location.path("/employerRegister");
  };
});

// Registration Controller
app.controller("RegisterController", function ($scope, $location, AuthService) {
  $scope.userData = {
    email: "",
  };

  $scope.errorMessage = "";
  $scope.successMessage = "";

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-z0-9.-]+\.[a-zA-Z]{2,}$/;

  $scope.test = function (email) {
    return emailRegex.test(email);
  };

  $scope.validateEmail = function(){
    if(!$scope.test($scope.userData.email)){
      $scope.emailMessage = "Input valid email format";
      $scope.successMessage = "";
      $scope.validate = false;
    } else {
      $scope.emailMessage = "";
      $scope.successMessage = "";
      $scope.validate = true;
    };
  }

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

            if (response.data.test_otp) {
              sessionStorage.setItem("testOTP", response.data.test_otp);

              // store otp expiry timestamp for countdown
              if (response.data.otp_expiry) {
                sessionStorage.setItem("otp_expiry", response.data.otp_expiry);
              }
            }

            // Redirect to OTP verification page after 1.5 seconds
            setTimeout(function () {
              $scope.$apply(function () {
                $location.path("/verify-otp");
              });
            }, 1500);
          } else {
            $scope.errorMessage =
              response.data.message || "Registration Failed";
            $scope.successMessage = "";
          }
        })
        .catch(function (error) {
          console.error("Registration error:", error);
          $scope.errorMessage =
            "Server error occurred. Please try again later.";
          $scope.successMessage = "";
        });
  };

  $scope.goToLogin = function () {
    $location.path("/login");
  };
});

// OTP Verification Controller
app.controller(
  "VerifyOtpController",
  function ($scope, $location, $http, $interval) {
    $scope.verificationData = {
      email:
        sessionStorage.getItem("pendingEmail") ||
        sessionStorage.getItem("verifiedEmail") ||
        "",
      otp: sessionStorage.getItem("testOTP") || "",
    };

    $scope.errorMessage = "";
    $scope.successMessage = "";
    $scope.countdownDisplay = "";
    $scope.otpExpired = false;

    var countdownTimer;

    intializedCountdown();

    // If no pending email, redirect to registration
    if (!$scope.verificationData.email) {
      $location.path("/register");
    }

    function intializedCountdown() {
      //clear any existing timer
      if (countdownTimer) {
        $interval.cancel(countdownTimer);
      }

      var otpExpiry = sessionStorage.getItem("otp_expiry");
      if (!otpExpiry) {
        $scope.countdownDisplay = "OTP expired";
        $scope.otpExpired = true;
        return;
      }

      //start count down
      updateCountdown(otpExpiry);

      countdownTimer = $interval(function () {
        updateCountdown(otpExpiry);
      }, 1000); // update every seconds
    }

    //update countdown display
    function updateCountdown(expirytimestamp) {
      var currentTime = Math.floor(Date.now() / 1000); // current time in seconds
      var timeleft = parseInt(expirytimestamp) - currentTime;

      if (timeleft <= 0) {
        $interval.cancel(countdownTimer);
        $scope.countdownDisplay = "OTP expired";
        $scope.otpExpired = true;
        return;
      }

      // calculate minutes and seconds
      var minutes = Math.floor(timeleft / 60);
      var seconds = timeleft % 60;

      // format display ( add leading zero if needed)
      $scope.countdownDisplay =
        minutes + ":" + (seconds < 10 ? "0" + seconds : seconds);
      $scope.otpExpired = false;
    }

    $scope.verifyOtp = function () {
      if (!$scope.verificationData.otp) {
        $scope.errorMessage = "Please enter the OTP";
        return;
      }

      if ($scope.otpExpired) {
        $scope.errorMessage = "OTP has expired. Please request a new one";
        return;
      }

      $http
        .post("verify_otp.php", $scope.verificationData)
        .then(function (response) {
          if (response.data.success) {
            // cancel count down timer
            if (countdownTimer) {
              $interval.cancel(countdownTimer);
            }

            $scope.successMessage = "Email verified successfully!";
            $scope.errorMessage = "";

            // Clear the pending email
            sessionStorage.removeItem("pendingEmail");
            sessionStorage.removeItem("testOTP");
            sessionStorage.removeItem("otp_expiry");
            sessionStorage.setItem(
              "verifiedEmail",
              $scope.verificationData.email
            );

            // Redirect to complete profile page
            setTimeout(function () {
              $scope.$apply(function () {
                $location.path("/complete-profile");
              });
            }, 1500);
          } else {
            console.error("ERror Occur: ", response.data.message);
            $scope.errorMessage =
              response.data.message || "Verification Failed";
            $scope.successMessage = "";
          }
        })
        .catch(function (error) {
          console.error("Verification error:", error);
          $scope.errorMessage =
            "Server error occurred. Please try again later.";
          $scope.successMessage = "";
        });
    };

    $scope.resendOtp = function () {
      $http
        .post("resend_otp.php", { email: $scope.verificationData.email })
        .then(function (response) {
          if (response.data.success) {
            $scope.successMessage = "New OTP sent successfully!";
            $scope.errorMessage = "";

            // save test OTP for display
            if (response.data.test_otp) {
              sessionStorage.setItem("testOTP", response.data.test_otp);
              sessionStorage.setItem("otp_expiry", response.data.otp_expiry);
              $scope.verificationData.otp = response.data.test_otp;

              // reset and start countdown with new  expiry
              intializedCountdown();
            }
          } else {
            $scope.errorMessage =
              response.data.message || "Failed to resend OTP";
            $scope.successMessage = "";
          }
        })
        .catch(function (error) {
          console.error("Resend OTP error:", error);
          $scope.errorMessage =
            "Server error occurred. Please try again later.";
          $scope.successMessage = "";
        });
    };

    $scope.goBack = function () {
      //cancel countdown timer when navigating away
      if (countdownTimer) {
        $interval.cancel(countdownTimer);
      }
      $location.path("/register");
    };

    // clean up when controller destroyed
    $scope.$on("$destroy", function () {
      if (countdownTimer) {
        $interval.cancel(countdownTimer);
      }
    });
  }
);

// Complete Profile Controller
app.controller(
  "CompleteProfileController",
  function ($scope, $location, $http, AuthService) {
    $scope.userData = {
      email: sessionStorage.getItem("verifiedEmail") || "",
      username: "",
      password: "",
      confirmPassword: "",
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

      AuthService.completeProfile($scope.userData)
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
            $scope.errorMessage =
              response.data.message || "Profile Update Failed";
            $scope.successMessage = "";
          }
        })
        .catch(function (error) {
          console.error("Profile completion error:", error);
          $scope.errorMessage =
            "Server error occurred. Please try again later.";
          $scope.successMessage = "";
        });
    };
  }
);
//Content controller
app.controller(
  "ContentController",
  function ($scope, $location, $http, AuthService) {
    $scope.profile = {}; // store the user profile

    // get the data from database using the php
    $http.get("profile.php").then(function (response) {
      if (response.data.success) {
        $scope.profile = response.data.profile;
      }
    });

    $scope.steps = [
      { title: "Employment", icon: "fa fa-briefcase" },
      { title: "Personal", icon: "fa fa-user-o"},
      { title: "Qualifications", icon: "fa fa-mortar-board" },
      { title: "Competencies", icon: "fa fa-flash" },
      { title: "Visibility", icon: "fa fa-check-circle-o" },
    ];

    $scope.currentStep = 0;

    $scope.nextStep = function () {
      if ($scope.currentStep < $scope.steps.length - 1) {
        $scope.currentStep++;
      }
    };

    $scope.prevStep = function () {
      if ($scope.currentStep > 0) {
        $scope.currentStep--;
      }
    };

    $scope.goToStep = function (step) {
      $scope.currentStep = step;
    };

    $scope.ratings = {
      verbalRate : 0,
      writtenRate : 0,
      verbalPercentage: '0%',
      writtenPercentage: '0%'
    }

    $scope.handleRate = function(field, index){

      $scope.ratings[field] = index + 1;
      const percentageField = field.replace('Rate', 'Percentage');
      $scope.ratings[percentageField] = ($scope.ratings[field] * 10) + '%';

    }

    $scope.viewProfile = function () {
      $location.path("/profile");
    };

    $scope.logout = function () {
      AuthService.logout().then(function () {
        $location.path("/login");
      });
    };
  }
);

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
