using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Http;
using System.Web.Routing;
using Microsoft.Owin;
using Microsoft.Owin.Security.OAuth;
using Owin;

[assembly: OwinStartup(typeof(TubularBaseProject.WebApiApplication))]

namespace TubularBaseProject
{
    public class WebApiApplication : System.Web.HttpApplication
    {
        public static string PublicClientId { get; private set; }

        public void Configuration(IAppBuilder app)
        {
            // Configure the application for OAuth based flow
            PublicClientId = "self";
            var oAuthOptions = new OAuthAuthorizationServerOptions
            {
                TokenEndpointPath = new PathString("/api/token"),
                Provider = new ApplicationOAuthProvider(PublicClientId),
                AccessTokenExpireTimeSpan = TimeSpan.FromDays(14),
                AllowInsecureHttp = true,
                AuthenticationMode = Microsoft.Owin.Security.AuthenticationMode.Active,
                AuthenticationType = "Bearer"
            };

            // Enable the application to use bearer tokens to authenticate users
            app.UseOAuthBearerTokens(oAuthOptions);

            GlobalConfiguration.Configure(WebApiConfig.Register);
            // Default route
            RouteTable.Routes.MapPageRoute("Default", "{*anything}", "~/index.html");
        }
    }
}
